import { test, expect } from '@playwright/test';
import * as tls from 'tls';
import * as url from 'url';
import * as fs from 'fs';
import * as nodemailer from 'nodemailer';

const urls = [
    'https://accenture.3-cubed.com/',
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

// Email Options
const emailConfig = {
    service: 'gmail',
    auth: {
        user: 'infoinsorce@gmail.com',
        pass: 'eqin jjsq gnkm osei'
    },
    from: 'SSL Monitor <infoinsorce@gmail.com>',
    to: 'mahesh.o@insorce.com, ramakrishna.b@insorce.com'
};

async function getSSLCertificateInfo(targetUrl: string): Promise<{
    valid: boolean;
    validFrom?: string;
    validTo?: string;
    issuer?: string;
    daysRemaining?: number;
    error?: string;
}> {
    return new Promise((resolve) => {
        const parsedUrl = url.parse(targetUrl);

        if (parsedUrl.protocol !== 'https:') {
            resolve({ valid: false, error: 'Not HTTPS' });
            return;
        }

        const options = {
            host: parsedUrl.hostname,
            port: parseInt(parsedUrl.port || '443'),
            servername: parsedUrl.hostname, // SNI
            rejectUnauthorized: false,
        };

        const socket = tls.connect(options, () => {
            // ... existing logic ...
            const cert = socket.getPeerCertificate();

            if (!cert || Object.keys(cert).length === 0) {
                resolve({ valid: false, error: 'No certificate found' });
                socket.end();
                return;
            }

            const validTo = new Date(cert.valid_to);
            const validFrom = new Date(cert.valid_from);
            const daysRemaining = Math.floor((validTo.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

            resolve({
                valid: true,
                validFrom: validFrom.toISOString(),
                validTo: validTo.toISOString(),
                issuer: (cert.issuer as any).O || (cert.issuer as any).CN,
                daysRemaining: daysRemaining
            });
            socket.end();
        });

        socket.on('error', (err) => {
            resolve({ valid: false, error: err.message });
        });

        socket.setTimeout(10000, () => {
            resolve({ valid: false, error: 'Connection timed out' });
            socket.destroy();
        });
    });
}

async function sendEmailReport(htmlContent: string, subject: string) {
    try {
        const transporter = nodemailer.createTransport({
            service: emailConfig.service,
            auth: emailConfig.auth
        });

        await transporter.sendMail({
            from: emailConfig.from,
            to: emailConfig.to,
            subject: subject,
            html: htmlContent
        });
        console.log('📧 Email sent successfully to ' + emailConfig.to);
    } catch (error: any) {
        console.error('❌ Error sending email:', error.message);
    }
}

test('Validate SSL Certificate Expiry', async ({ request }) => {
    test.setTimeout(300000); // 5 minutes timeout
    let reportOutput = '';
    const log = (message: string) => {
        console.log(message);
        reportOutput += message + '\n';
    };

    // Prepare HTML Report
    let htmlRows = '';
    let hasIssues = false;
    let expiredCount = 0;

    log('\n🔐 Service Availability & SSL Report');
    log('================================================================================================================================');
    log(`| ${'URL'.padEnd(38)} | ${'HTTP'.padEnd(8)} | ${'SSL'.padEnd(8)} | ${'Days Left'.padEnd(10)} | ${'Expiry'.padEnd(12)} | ${'Evidence/Error'.padEnd(30)} |`);
    log('================================================================================================================================');

    for (const site of urls) {
        // 1. Check HTTP Status (Availability)
        let httpStatus = 'DOWN';
        let httpIcon = '❌';
        let errorEvidence = '';
        let rowColor = '';

        try {
            const startTime = Date.now();
            const response = await request.get(site, { timeout: 60000, ignoreHTTPSErrors: true });
            const duration = Date.now() - startTime;

            const status = response.status();
            if (status >= 200 && status < 400) {
                httpStatus = status.toString();
                httpIcon = '✅';
                if (duration > 60000) {
                    httpIcon = '⚠️';
                    errorEvidence = `Slow response: ${(duration / 1000).toFixed(1)}s`;
                }
            } else {
                httpStatus = status.toString();
                httpIcon = '⚠️';
                errorEvidence = `Status: ${response.statusText()}`;
                hasIssues = true;
                rowColor = '#fff3cd'; // Yellow warn
            }
        } catch (e: any) {
            httpStatus = 'ERR';
            httpIcon = '❌';
            errorEvidence = e.message.split('\n')[0].substring(0, 30);
            hasIssues = true;
            rowColor = '#f8d7da'; // Red error
        }

        // 2. Check SSL Certificate
        const sslResult = await getSSLCertificateInfo(site);

        let sslStatus = 'ERR';
        let sslIcon = '❌';
        let daysLeftStr = '-';
        let expiryDateStr = '-';

        if (sslResult.valid) {
            sslStatus = 'OK';
            daysLeftStr = sslResult.daysRemaining!.toString();
            expiryDateStr = sslResult.validTo!.split('T')[0];

            if (sslResult.daysRemaining! > 30) {
                sslIcon = '✅';
            } else if (sslResult.daysRemaining! > 0) {
                sslIcon = '⚠️';
                rowColor = '#fff3cd';
            } else {
                sslIcon = '❌'; // Expired
                sslStatus = 'EXP';
                if (!errorEvidence) errorEvidence = `Expired ${Math.abs(sslResult.daysRemaining!)} days ago`;
                hasIssues = true;
                expiredCount++;
                rowColor = '#f8d7da';
            }
        } else if (sslResult.error === 'Not HTTPS') {
            sslIcon = '⚪';
            sslStatus = 'N/A';
        } else {
            sslIcon = '❌';
            if (!errorEvidence) errorEvidence = sslResult.error || 'SSL Handshake Failed';
            hasIssues = true;
            rowColor = '#f8d7da';
        }

        log(`| ${site.padEnd(38)} | ${httpIcon} ${httpStatus.padEnd(4)} | ${sslIcon} ${sslStatus.padEnd(4)} | ${daysLeftStr.padEnd(10)} | ${expiryDateStr.padEnd(12)} | ${errorEvidence.padEnd(30)} |`);

        // Add to email HTML
        htmlRows += `
        <tr style="background-color: ${rowColor || '#ffffff'};">
            <td style="padding: 8px; border: 1px solid #ddd;">${site}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${httpIcon} ${httpStatus}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${sslIcon} ${sslStatus}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${daysLeftStr}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${expiryDateStr}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${errorEvidence}</td>
        </tr>`;

        // Soft assertions
        if (httpIcon !== '✅') {
            expect.soft(httpStatus, `${site} is DOWN`).toMatch(/^(2|3)\d\d$/);
        }
    }
    log('================================================================================================================================\n');

    // Save report to file
    fs.writeFileSync('ssl_report.txt', reportOutput);

    // Send Email
    const emailSubject = hasIssues
        ? `⚠️ ALERT: Service/SSL Issues Detected - ${expiredCount} Expired`
        : `✅ Daily Service & SSL Report - All Systems Normal`;

    const htmlBody = `
    <h2>Service Availability & SSL Status Report</h2>
    <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
    <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif;">
        <tr style="background-color: #f2f2f2;">
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">URL</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">HTTP Status</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">SSL Status</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Days Left</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Expiry</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Notes</th>
        </tr>
        ${htmlRows}
    </table>
    <br>
    <p>Generated by Playwright Monitoring Script.</p>
    `;

    console.log('📧 Sending email report...');
    await sendEmailReport(htmlBody, emailSubject);
});
