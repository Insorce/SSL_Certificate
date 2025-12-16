const axios = require('axios');
const nodemailer = require('nodemailer');

// ----------------------------------
// EMAIL CONFIGURATION
// ----------------------------------
const emailConfig = {
    service: 'gmail', // Change to your email service (gmail, outlook, etc.)
    auth: {
        user: process.env.EMAIL_USER || 'infoinsorce@gmail.com', // Set EMAIL_USER environment variable or replace
        pass: process.env.EMAIL_PASS || 'eqin jjsq gnkm osei' // Set EMAIL_PASS environment variable or replace (Gmail App Password)
    },
    from: process.env.EMAIL_USER || 'your-email@gmail.com',
    to: process.env.EMAIL_TO || 'recipient@example.com' // Set EMAIL_TO environment variable or replace
};

// List of API endpoints to test
const apiEndpoints = [
    'http://accenture.3-cubed.com/',
    'https://apitest2.3-cubed.com/docs',
    'https://semantics.3-cubed.com/docs',
    'https://chatbotapi.3-cubed.com/docs',
    'https://ingen.3-cubed.com/docs',
    'https://solgen.3-cubed.com/docs',
    'https://duagent.3-cubed.com/docs',
    'https://duapi.3-cubed.com/docs',
    'https://wizard.3-cubed.com/docs',
    'https://insighter.3-cubed.com',
    'https://infosys.3-cubed.com/',
    'https://prod.3-cubed.com/',
    'https://pwctraining.3-cubed.com/',
    'https://pbl.3-cubed.com/',
    'https://sandbox.3-cubed.com/',
    'https://sutherland.3-cubed.com/',
    'https://pdf.3-cubed.com/docs',
    'https://diagnostics.3-cubed.com/docs'
];

// ----------------------------------
// TEST API ENDPOINT
// ----------------------------------
async function testApiEndpoint(url) {
    try {
        const response = await axios.get(url, {
            timeout: 5000,
            validateStatus: function (status) {
                return status < 500; // Accept any status < 500
            }
        });

        const status = response.status;
        const statusText = response.statusText;
        const passed = status >= 200 && status < 400;
        const icon = passed ? '✅' : '⚠️';

        console.log(`${icon} ${url}`);
        console.log(`   Status: ${status} ${statusText}\n`);

        return {
            url,
            status,
            statusText,
            passed
        };
    } catch (error) {
        console.log(`❌ ${url}`);
        console.log(`   Error: ${error.message}\n`);

        return {
            url,
            status: 'ERROR',
            statusText: error.message,
            passed: false
        };
    }
}

// ----------------------------------
// MAIN FUNCTION TO TEST ALL ENDPOINTS
// ----------------------------------
async function runTests() {
    console.log("\n🚀 Running API Status Tests...\n");
    console.log("============================\n");

    const results = [];

    for (const endpoint of apiEndpoints) {
        const result = await testApiEndpoint(endpoint);
        results.push(result);
    }

    // Summary
    console.log("\n============================");
    console.log("📊 TEST SUMMARY");
    console.log("============================\n");

    const passedCount = results.filter(r => r.passed).length;
    const failedCount = results.filter(r => !r.passed).length;

    console.log(`Total Endpoints: ${results.length}`);
    console.log(`✅ Passed (2xx/3xx): ${passedCount}`);
    console.log(`❌ Failed (4xx/5xx/ERROR): ${failedCount}\n`);

    // Detailed results table
    console.log("Detailed Results:");
    console.log("─".repeat(80));
    results.forEach(result => {
        const status = typeof result.status === 'number' ? result.status : result.status;
        const icon = result.passed ? '✅' : '❌';
        console.log(`${icon} ${result.url.padEnd(50)} | Status: ${String(status).padEnd(5)} | ${result.statusText}`);
    });
    console.log("─".repeat(80));

    console.log("\n🎉 All tests completed!\n");

    // Send email report
    console.log("📧 Sending email report...");
    await sendEmailReport(results);
}

// ----------------------------------
// SEND EMAIL WITH RESULTS
// ----------------------------------
async function sendEmailReport(results) {
    try {
        const transporter = nodemailer.createTransport({
            service: emailConfig.service,
            auth: emailConfig.auth
        });

        // Build HTML email content
        const passedCount = results.filter(r => r.passed).length;
        const failedCount = results.filter(r => !r.passed).length;

        let htmlContent = `
        <h2>🚀 API Status Test Report</h2>
        <p><strong>Test Date:</strong> ${new Date().toLocaleString()}</p>
        <hr>
        <h3>📊 Summary</h3>
        <ul>
            <li>Total Endpoints: ${results.length}</li>
            <li><span style="color: green;">✅ Passed (2xx/3xx): ${passedCount}</span></li>
            <li><span style="color: red;">❌ Failed (4xx/5xx/ERROR): ${failedCount}</span></li>
        </ul>
        <hr>
        <h3>Detailed Results</h3>
        <table border="1" cellpadding="10" cellspacing="0" style="width: 100%; border-collapse: collapse;">
            <tr style="background-color: #f0f0f0;">
                <th>Status</th>
                <th>URL</th>
                <th>HTTP Status</th>
                <th>Status Text</th>
            </tr>
        `;

        results.forEach(result => {
            const icon = result.passed ? '✅' : '❌';
            const statusBg = result.passed ? '#d4edda' : '#f8d7da';
            htmlContent += `
            <tr style="background-color: ${statusBg};">
                <td>${icon}</td>
                <td><a href="${result.url}">${result.url}</a></td>
                <td>${result.status}</td>
                <td>${result.statusText}</td>
            </tr>
            `;
        });

        htmlContent += `
        </table>
        <hr>
        <p style="color: #666; font-size: 12px;">Report generated at ${new Date().toISOString()}</p>
        `;

        const mailOptions = {
            from: emailConfig.from,
            to: emailConfig.to,
            subject: `🔍 API Status Report - ${passedCount} Passed, ${failedCount} Failed`,
            html: htmlContent
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('📧 Email sent successfully!');
        console.log('Message ID:', info.messageId);
    } catch (error) {
        console.error('❌ Error sending email:', error.message);
    }
}

// Run the test suite
runTests();
