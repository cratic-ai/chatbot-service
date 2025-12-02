//require('dotenv').config();
//const { AzureOpenAI } = require("openai");
//
//const testNames = [
//    'gpt-5-mini-craticai',
//    'gpt-4-mini-craticai',
//    'gpt5-mini-craticai',
//    'gpt-5-mini',
//    'gpt-4o-mini-craticai',
//    'craticai-gpt-5-mini',
//    'gpt-4o-mini',
//];
//
//const client = new AzureOpenAI({
//  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
//  apiKey: process.env.AZURE_OPENAI_API_KEY,
//  apiVersion: "2024-08-01-preview"
//});
//
//async function test() {
//  console.log('🔍 Testing deployment names...\n');
//
//  for (const name of testNames) {
//    try {
//      await client.chat.completions.create({
//        model: name,
//        messages: [{ role: "user", content: "test" }],
//        max_tokens: 5
//      });
//      console.log(`✅ FOUND IT! Deployment name is: "${name}"`);
//      console.log(`\nUpdate your .env with:`);
//      console.log(`AZURE_OPENAI_DEPLOYMENT_NAME=${name}`);
//      return;
//    } catch (error) {
//      console.log(`❌ "${name}" - Not found`);
//    }
//  }
//
//  console.log('\n⚠️ None of the common names worked.');
//  console.log('Please check Azure Portal for the exact deployment name.');
//}
//
//test();
//const https = require('https');npm install @google/generative-ai
//
//const subscriptionId = 'a5ba4b83-42be-471f-ba1b-e20008002a75';
//const resourceGroup = 'CAI_genai';
//const accountName = 'CAI-openai';
//
//console.log('Checking deployments for:', accountName);
//console.log('Resource Group:', resourceGroup);
//console.log('\n⚠️ Note: This requires Azure authentication');
//console.log('Please use Azure Portal or Azure CLI instead for easier access.\n');
//console.log('Azure Portal URL:');
//console.log(`https://portal.azure.com/#@/resource/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.CognitiveServices/accounts/${accountName}/deployments`);npmnpm run dev

// Quick test
exports.testConnection = async (req, res) => {
    try {
        const ai = getAI();
        console.log('✅ AI instance created successfully:', typeof ai);
        res.json({ status: 'ok', message: 'Gemini AI connected' });
    } catch (error) {
        console.error('❌ Connection failed:', error);
        res.status(500).json({ error: error.message });
    }
};