#!/bin/bash

# Deploy process-file function with CORS fixes
# This script deploys the function to fix CORS issues

echo "🚀 Deploying process-file function with CORS fixes..."
echo ""

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing via npx..."
    npx supabase functions deploy process-file
else
    echo "✅ Supabase CLI found"
    supabase functions deploy process-file
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Clear your browser cache (Ctrl+Shift+R / Cmd+Shift+R)"
echo "2. Test file upload in the application"
echo "3. Check function logs if issues persist:"
echo "   npx supabase functions logs process-file --tail"
echo ""

