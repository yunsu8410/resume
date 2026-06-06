import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export async function POST(request: NextRequest) {
    console.log('PDF generation started');

    try {
        const executablePath = await chromium.executablePath();
        
        const browser = await puppeteer.launch({
            args: [
                ...chromium.args,
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--single-process',
            ],
            defaultViewport: chromium.defaultViewport,
            executablePath: executablePath,
            headless: true,
        });

        const page = await browser.newPage();

        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
            || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `http://localhost:${process.env.PORT || 3000}`);

        await page.goto(`${baseUrl}/`, {
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        await page.evaluate(() => {
            document.body.classList.add('pdf-mode');
            const container = document.querySelector('.container') as HTMLElement;
            if (container) {
                container.style.cssText = 'column-count: 2; column-gap: 3rem; column-fill: auto;';
            }
            const pdfButtons = document.querySelectorAll('.pdf-download-button, .pdf-link-button');
            pdfButtons.forEach(button => {
                (button as HTMLElement).style.display = 'none';
            });
        });

        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '2cm',
                bottom: '2cm',
                left: '1cm',
                right: '1cm'
            },
            displayHeaderFooter: false
        });

        await browser.close();

        return new Response(Buffer.from(pdf), {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename="resume.pdf"'
            }
        });

    } catch (error) {
        console.error('PDF generation failed:', error);
        return NextResponse.json(
            {
                error: 'PDF generation failed',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
