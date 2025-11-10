# SAP Identity Authentication Service (IAS) Setup for Social Login

## Overview
This guide configures IAS to enable Google and Facebook social authentication for the Checklist app, replacing Supabase Auth while maintaining the same user experience.

## Prerequisites
- SAP BTP Global Account with IAS tenant
- Google OAuth Client ID and Secret
- Facebook App ID and Secret (optional)
- XSUAA service instance already created

## Step 1: Access IAS Admin Console

1. Go to your SAP BTP Cockpit
2. Navigate to **Security** > **Trust Configuration**
3. Click on **SAP Identity Authentication Service**
4. Click **Open Administration Console**

## Step 2: Configure Google as Identity Provider

1. In IAS Admin Console, go to **Applications & Resources** > **Identity Providers**
2. Click **Create** > **Corporate Identity Provider**
3. Select **Google** as the type
4. Fill in the configuration:
   - **Display Name**: Google
   - **Client ID**: [Your Google OAuth Client ID]
   - **Client Secret**: [Your Google OAuth Client Secret]
   - **Scopes**: `openid email profile`
5. Click **Save**

### Get Google OAuth Credentials

If you don't have Google OAuth credentials:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth 2.0 Client ID**
5. Configure consent screen if not done
6. Application type: **Web application**
7. Authorized redirect URIs: `https://[your-ias-tenant].accounts.ondemand.com/oauth2/callback`
8. Copy **Client ID** and **Client Secret**

## Step 3: Configure Facebook (Optional)

1. In IAS Admin Console, go to **Identity Providers**
2. Click **Create** > **Social Identity Provider**
3. Select **Facebook**
4. Fill in:
   - **Display Name**: Facebook
   - **App ID**: [Your Facebook App ID]
   - **App Secret**: [Your Facebook App Secret]
5. Click **Save**

### Get Facebook App Credentials

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or use existing
3. Go to **Settings** > **Basic**
4. Copy **App ID** and **App Secret**
5. Add **Valid OAuth Redirect URIs**: `https://[your-ias-tenant].accounts.ondemand.com/oauth2/callback`

## Step 4: Create Application in IAS

1. Go to **Applications & Resources** > **Applications**
2. Click **Create**
3. Fill in:
   - **Display Name**: Checklist Task Manager
   - **Home URL**: `https://[your-cf-app-url].cfapps.eu12.hana.ondemand.com`
   - **Type**: Web
4. Click **Save**

## Step 5: Configure Application Authentication

1. Select the newly created application
2. Go to **Authentication and Access** > **Identity Providers**
3. Enable:
   - ✅ **Google**
   - ✅ **Facebook** (if configured)
   - ✅ **SAP ID Service** (as fallback)
4. Set **Default Identity Provider**: Google
5. Go to **Branding and Layout** > **Login Page**
6. Enable **Social Sign-On Buttons**
7. Click **Save**

## Step 6: Configure Attribute Mapping

1. In the application settings, go to **Attributes**
2. Add attribute mappings:
   - **email** → `mail`
   - **given_name** → `first_name`
   - **family_name** → `last_name`
   - **name** → `full_name`
3. Click **Save**

## Step 7: Configure Trust in XSUAA

1. In IAS Admin Console, go to your application
2. Navigate to **Trust** > **SAML 2.0 Configuration**
3. Download the **IAS Metadata XML**
4. In SAP BTP Cockpit, go to your subaccount
5. Navigate to **Security** > **Trust Configuration**
6. Click **New Trust Configuration**
7. Upload the IAS metadata XML
8. Set **Name**: `IAS Social Login`
9. Click **Save**

## Step 8: Update XSUAA Configuration

Update `xs-security.json` to reference IAS as the identity provider:

```json
{
  "xsappname": "checklist-app",
  "tenant-mode": "dedicated",
  "oauth2-configuration": {
    "redirect-uris": [
      "https://*cfapps.eu12.hana.ondemand.com/**"
    ]
  },
  "scopes": [
    {
      "name": "$XSAPPNAME.Display",
      "description": "Display checklists"
    },
    {
      "name": "$XSAPPNAME.Edit",
      "description": "Edit checklists"
    }
  ],
  "role-templates": [
    {
      "name": "Viewer",
      "description": "Checklist viewer",
      "scope-references": ["$XSAPPNAME.Display"]
    },
    {
      "name": "Editor",
      "description": "Checklist editor",
      "scope-references": ["$XSAPPNAME.Display", "$XSAPPNAME.Edit"]
    }
  ],
  "role-collections": [
    {
      "name": "ChecklistViewer",
      "description": "Checklist Viewer Role Collection",
      "role-template-references": ["$XSAPPNAME.Viewer"]
    },
    {
      "name": "ChecklistEditor",
      "description": "Checklist Editor Role Collection",
      "role-template-references": ["$XSAPPNAME.Editor"]
    }
  ]
}
```

## Step 9: Test Social Login

1. Deploy the updated application to CF
2. Access the App Router URL
3. You should see login options with Google/Facebook buttons
4. Click **Continue with Google** or **Continue with Facebook**
5. Complete the OAuth flow
6. Verify you're redirected back to the application

## Verification

After successful configuration:

- ✅ Users see "Continue with Google" / "Continue with Facebook" buttons
- ✅ No Supabase login screen appears
- ✅ OAuth flow completes via IAS
- ✅ XSUAA session is established
- ✅ User identity is available in backend via JWT token

## Troubleshooting

**Error: Redirect URI mismatch**
- Verify redirect URIs are correctly configured in Google/Facebook console
- IAS callback URL must match exactly

**Error: Invalid client**
- Double-check Client ID and Secret in IAS configuration
- Ensure credentials are from the correct Google/Facebook project

**Error: User not authorized**
- Check role collections are assigned in BTP Cockpit
- Navigate to **Security** > **Users** and assign roles manually

## Next Steps

Once IAS is configured:
1. ✅ Remove Supabase auth code from frontend
2. ✅ Create backend API to handle user sessions
3. ✅ Migrate database to BTP PostgreSQL
