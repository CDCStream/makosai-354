import { Worksheet } from './types';
import katex from 'katex';

// DOM-based modal for non-React contexts
function showDOMModal(message: string, type: 'error' | 'warning' | 'info' = 'warning') {
  const colors = {
    error: { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b', button: '#dc2626' },
    warning: { bg: '#fffbeb', border: '#fcd34d', text: '#92400e', button: '#f59e0b' },
    info: { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af', button: '#3b82f6' },
  };
  const c = colors[type];

  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.5);
    display: flex; align-items: center; justify-content: center; z-index: 99999;
  `;

  overlay.innerHTML = `
    <div style="background: white; border-radius: 16px; max-width: 400px; width: 90%; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);">
      <div style="background: ${c.bg}; border-bottom: 2px solid ${c.border}; padding: 16px 20px;">
        <h3 style="margin: 0; color: ${c.text}; font-size: 18px; font-weight: 600;">
          ${type === 'error' ? '❌ Error' : type === 'warning' ? '⚠️ Warning' : 'ℹ️ Info'}
        </h3>
      </div>
      <div style="padding: 20px;">
        <p style="margin: 0; color: #374151; line-height: 1.5;">${message}</p>
      </div>
      <div style="padding: 16px 20px; background: #f9fafb; display: flex; justify-content: flex-end;">
        <button id="modal-close-btn" style="
          background: ${c.button}; color: white; border: none; padding: 10px 24px;
          border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;
        ">OK</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const closeBtn = overlay.querySelector('#modal-close-btn');
  const close = () => document.body.removeChild(overlay);
  closeBtn?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}

// Helper function to render LaTeX in text
function renderLatexToHtml(text: string): string {
  if (!text) return '';

  // Replace display math ($$...$$) first
  let result = text.replace(/\$\$([\s\S]*?)\$\$/g, (match, latex) => {
    try {
      return katex.renderToString(latex, {
        displayMode: true,
        throwOnError: false,
        output: 'html',
      });
    } catch (e) {
      console.error('KaTeX display error:', e);
      return match;
    }
  });

  // Replace inline math ($...$)
  result = result.replace(/\$([^$]+)\$/g, (match, latex) => {
    try {
      return katex.renderToString(latex, {
        displayMode: false,
        throwOnError: false,
        output: 'html',
      });
    } catch (e) {
      console.error('KaTeX inline error:', e);
      return match;
    }
  });

  return result;
}

// Helper function to strip LaTeX for plain text (PDF)
function stripLatex(text: string): string {
  if (!text) return '';

  // Replace display math
  let result = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, latex) => {
    return `[${latex}]`;
  });

  // Replace inline math
  result = result.replace(/\$([^$]+)\$/g, (_, latex) => {
    return latex;
  });

  return result;
}

export async function exportToPdf(worksheet: Worksheet, content: 'questions' | 'answer_key' | 'both' = 'both'): Promise<void> {
  console.log('🚀 PDF Export started - using iframe + jsPDF');

  const title = content === 'questions'
    ? worksheet.title
    : content === 'answer_key'
    ? `${worksheet.title} - Answer Key`
    : worksheet.title;

  // Generate print-friendly HTML
  const printHtml = generatePrintablePdfHtml(worksheet, content, title);

  // Create an iframe to properly render the full HTML
  const iframe = document.createElement('iframe');
  iframe.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 794px;
    height: 1123px;
    border: none;
    opacity: 0;
    pointer-events: none;
    z-index: -1;
  `;
  document.body.appendChild(iframe);

  try {
    // Write HTML to iframe
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      throw new Error('Could not access iframe document');
    }

    iframeDoc.open();
    iframeDoc.write(printHtml);
    iframeDoc.close();

    // Wait for content and fonts to load
    await new Promise(resolve => setTimeout(resolve, 1000));

    // A4 page height in pixels at 96 DPI (accounting for padding)
    const PAGE_HEIGHT_PX = 1050; // ~A4 height minus margins

    // Find all question elements and add page break spacers where needed
    const questions = iframeDoc.querySelectorAll('[data-question]');
    questions.forEach((questionEl) => {
      const el = questionEl as HTMLElement;
      const rect = el.getBoundingClientRect();
      const questionTop = rect.top + iframeDoc.documentElement.scrollTop;
      const questionBottom = questionTop + rect.height;

      // Calculate which page this question starts on
      const startPage = Math.floor(questionTop / PAGE_HEIGHT_PX);
      // Calculate which page this question ends on
      const endPage = Math.floor(questionBottom / PAGE_HEIGHT_PX);

      // If question spans multiple pages, push it to next page
      if (startPage !== endPage && rect.height < PAGE_HEIGHT_PX * 0.8) {
        const spacerHeight = ((startPage + 1) * PAGE_HEIGHT_PX) - questionTop + 20;
        const spacer = iframeDoc.createElement('div');
        spacer.style.height = `${spacerHeight}px`;
        spacer.style.width = '100%';
        el.parentNode?.insertBefore(spacer, el);
      }
    });

    // Wait a bit for spacers to be applied
    await new Promise(resolve => setTimeout(resolve, 200));

    // Dynamic imports
    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF } = await import('jspdf');

    // Get the body element from iframe
    const body = iframeDoc.body;
    if (!body) {
      throw new Error('Iframe body not found');
    }

    // Capture the content
    const canvas = await html2canvas(body, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: 794,
      height: body.scrollHeight,
      windowWidth: 794,
      windowHeight: body.scrollHeight,
    });

    // Create PDF
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // Add first page
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    // Add additional pages if needed
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    // Generate filename
    const filename = content === 'questions'
      ? `${worksheet.title.replace(/\s+/g, '_')}_questions.pdf`
      : content === 'answer_key'
      ? `${worksheet.title.replace(/\s+/g, '_')}_answer_key.pdf`
      : `${worksheet.title.replace(/\s+/g, '_')}.pdf`;

    // Save PDF
    pdf.save(filename);
    console.log('✅ PDF exported successfully');
  } catch (error) {
    console.error('PDF export error:', error);
    showDOMModal('PDF oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.', 'error');
  } finally {
    // Clean up
    document.body.removeChild(iframe);
  }
}

// Generate print-friendly HTML with simple CSS for html2canvas compatibility
function generatePrintablePdfHtml(worksheet: Worksheet, content: 'questions' | 'answer_key' | 'both', title: string): string {
  const showQuestions = content === 'questions' || content === 'both';
  const showAnswerKey = (content === 'answer_key' || content === 'both') && worksheet.include_answer_key;

  // Calculate points
  const totalQuestions = worksheet.questions.length;
  const basePoints = Math.floor(100 / totalQuestions);
  const remainder = 100 - (basePoints * totalQuestions);
  const getQuestionPoints = (index: number): number => basePoints + (index < remainder ? 1 : 0);

  // Render LaTeX using KaTeX
  const renderLatex = (text: string): string => {
    return renderLatexToHtml(text);
  };

  // Render SVG images
  const renderImage = (image: string | undefined): string => {
    if (!image) return '';
    if (image.trim().startsWith('<svg')) {
      return `<div style="text-align: center; margin: 10px 0;">${image}</div>`;
    }
    return '';
  };

  // Render options based on question type - using simple inline styles
  const renderOptions = (q: { type: string; options?: string[] }): string => {
    if ((q.type === 'multiple_choice' || q.type === 'true_false') && q.options) {
      return `
        <div style="margin-left: 10px; margin-top: 10px;">
          ${q.options.map((opt, i) => `
            <table style="width: 100%; margin-bottom: 8px; background: #f8f8f8; border-radius: 6px; border-collapse: collapse;">
              <tr>
                <td style="width: 36px; padding: 8px; vertical-align: top; padding-top: 10px;">
                  <table style="width: 24px; height: 24px; border: 2px solid #0d9488; border-radius: 50%; border-collapse: collapse;">
                    <tr>
                      <td style="text-align: center; vertical-align: middle; font-weight: bold; color: #0d9488; font-size: 11px; padding: 0;">${String.fromCharCode(65 + i)}</td>
                    </tr>
                  </table>
                </td>
                <td style="padding: 8px 12px 8px 0; vertical-align: top;">${renderLatex(opt)}</td>
              </tr>
            </table>
          `).join('')}
        </div>
      `;
    }
    if (q.type === 'fill_blank') {
      return '<div style="margin: 15px 20px; border-bottom: 2px dashed #0d9488; height: 30px;"></div>';
    }
    if (q.type === 'short_answer') {
      return '<div style="margin: 10px 20px; border: 2px dashed #ccc; border-radius: 8px; height: 60px;"></div>';
    }
    if (q.type === 'essay') {
      return '<div style="margin: 10px 20px; border: 2px dashed #ccc; border-radius: 8px; height: 120px;"></div>';
    }
    return '';
  };

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, sans-serif;
      font-size: 12pt;
      line-height: 1.5;
      color: #333;
      background: white;
      padding: 20px;
      width: 754px;
    }
    .katex { font-size: 1em; vertical-align: middle; }
    .katex-display { margin: 0.5em 0; text-align: left; }
    .katex-display > .katex { text-align: left; }
    .katex .mord, .katex .mbin, .katex .mrel, .katex .mopen, .katex .mclose { vertical-align: baseline; }
  </style>
</head>
<body>
  <!-- Header -->
  <div style="text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 3px solid #0d9488;">
    <h1 style="color: #0d9488; font-size: 20pt; margin-bottom: 5px;">${title}</h1>
    <p style="color: #666; font-size: 10pt; margin-bottom: 10px;">Generated by Makos.ai</p>
    <table style="margin: 0 auto; border-collapse: separate; border-spacing: 4px;">
      <tr>
        <td style="background: #e0f2f1; color: #00695c; padding: 4px 10px; border-radius: 10px; font-size: 9pt; text-align: center; vertical-align: middle;">${worksheet.subject}</td>
        <td style="background: #e0f2f1; color: #00695c; padding: 4px 10px; border-radius: 10px; font-size: 9pt; text-align: center; vertical-align: middle;">Grade ${worksheet.grade_level}</td>
        <td style="background: #e0f2f1; color: #00695c; padding: 4px 10px; border-radius: 10px; font-size: 9pt; text-align: center; vertical-align: middle;">${worksheet.difficulty}</td>
      </tr>
    </table>
  </div>

  ${showQuestions ? `
    <h2 style="font-size: 14pt; color: #333; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 2px solid #0d9488;">Questions</h2>
    ${worksheet.questions.map((q, index) => `
      <div data-question="${index}" style="margin-bottom: 20px; padding: 15px; background: #fafafa; border-left: 4px solid #0d9488; border-radius: 0 8px 8px 0; page-break-inside: avoid;">
        <table style="width: 100%; margin-bottom: 10px; border-collapse: collapse;">
          <tr>
            <td style="vertical-align: middle; padding: 0;">
              <table style="display: inline-table; width: 26px; height: 26px; background: #0d9488; border-radius: 50%; border-collapse: collapse; margin-right: 8px; vertical-align: middle;">
                <tr><td style="text-align: center; vertical-align: middle; color: white; font-weight: bold; font-size: 11pt; padding: 0;">${index + 1}</td></tr>
              </table>
              <span style="display: inline-block; background: #e0f2f1; color: #00695c; padding: 4px 10px; border-radius: 10px; font-size: 9pt; font-weight: bold; vertical-align: middle;">${getQuestionTypeLabel(q.type)}</span>
            </td>
            <td style="vertical-align: middle; text-align: right; padding: 0;">
              <span style="display: inline-block; background: #0d9488; color: white; padding: 4px 10px; border-radius: 10px; font-size: 9pt; font-weight: bold;">${getQuestionPoints(index)} pts</span>
            </td>
          </tr>
        </table>
        <p style="font-size: 11pt; margin: 10px 0;">${renderLatex(q.question)}</p>
        ${renderImage(q.image)}
        ${renderOptions(q)}
      </div>
    `).join('')}
  ` : ''}

  ${showAnswerKey ? `
    <div style="margin-top: 30px; padding-top: 20px; border-top: 2px dashed #ccc;">
      <h2 style="color: #10b981; font-size: 16pt; margin-bottom: 15px;">✅ Answer Key</h2>
      ${worksheet.questions.map((q, index) => `
        <div data-question="answer-${index}" style="padding: 12px; background: #ecfdf5; border-radius: 8px; margin-bottom: 10px; page-break-inside: avoid;">
          <p style="margin-bottom: 5px;"><strong style="color: #0d9488;">${index + 1}.</strong> ${renderLatex(q.question)}</p>
          <p style="color: #10b981; font-weight: bold;">Answer: ${renderLatex(Array.isArray(q.correct_answer) ? q.correct_answer.join(', ') : String(q.correct_answer || ''))}</p>
          ${q.explanation ? `<p style="font-size: 10pt; color: #666; margin-top: 5px; font-style: italic;">💡 ${renderLatex(q.explanation)}</p>` : ''}
        </div>
      `).join('')}
    </div>
  ` : ''}

  <div style="margin-top: 30px; text-align: center; color: #999; font-size: 9pt; padding-top: 15px; border-top: 1px solid #eee;">
    Created with Makos.ai - AI Worksheet Generator
  </div>
</body>
</html>`;
}

// Generate HTML for PDF with LaTeX support
function generatePdfHtmlWithLatex(worksheet: Worksheet, content: 'questions' | 'answer_key' | 'both', title: string): string {
  const showQuestions = content === 'questions' || content === 'both';
  const showAnswerKey = (content === 'answer_key' || content === 'both') && worksheet.include_answer_key;

  // Calculate points per question (total = 100)
  const totalQuestions = worksheet.questions.length;
  const basePoints = Math.floor(100 / totalQuestions);
  const remainder = 100 - (basePoints * totalQuestions);
  const getQuestionPoints = (index: number): number => basePoints + (index < remainder ? 1 : 0);

  // Helper to render LaTeX
  const renderText = (text: string): string => renderLatexToHtml(text);

  // Helper to render SVG images
  const renderImage = (image: string | undefined): string => {
    if (!image) return '';
    if (image.trim().startsWith('<svg')) {
      return `<div style="display: flex; justify-content: center; margin: 10px 0;">${image}</div>`;
    }
    return '';
  };

  // Helper to render options
  const renderOptions = (q: { type: string; options?: string[] }): string => {
    if ((q.type === 'multiple_choice' || q.type === 'true_false') && q.options) {
      return `
        <div style="margin-left: 15px; margin-top: 10px;">
          ${q.options.map((opt, i) => `
            <table style="width: 100%; margin-bottom: 8px; background: #f8fffe; border-radius: 6px; border-collapse: collapse;">
              <tr>
                <td style="width: 36px; padding: 8px; vertical-align: top; padding-top: 10px;">
                  <table style="width: 22px; height: 22px; border: 2px solid #0d9488; border-radius: 50%; border-collapse: collapse;">
                    <tr><td style="text-align: center; vertical-align: middle; font-size: 11px; font-weight: 600; color: #0d9488; padding: 0;">${String.fromCharCode(65 + i)}</td></tr>
                  </table>
                </td>
                <td style="padding: 8px 12px 8px 0; vertical-align: top; color: #333; font-size: 13px;">${renderText(opt)}</td>
              </tr>
            </table>
          `).join('')}
        </div>
      `;
    }
    if (q.type === 'fill_blank') {
      return '<div style="margin: 15px 20px; border-bottom: 2px dashed #0d9488; padding: 12px 0;"></div>';
    }
    if (q.type === 'short_answer') {
      return '<div style="margin: 10px 20px; border: 2px dashed #ddd; border-radius: 8px; min-height: 60px;"></div>';
    }
    if (q.type === 'essay') {
      return '<div style="margin: 10px 20px; border: 2px dashed #ddd; border-radius: 8px; min-height: 120px;"></div>';
    }
    return '';
  };

  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #333; padding: 20px; background: white; max-width: 800px; margin: 0 auto;">
      <!-- KaTeX CSS inline -->
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
      <style>
        .katex { font-size: 1em; }
        * { box-sizing: border-box; }
      </style>

      <!-- Header -->
      <div style="text-align: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 3px solid #0d9488;">
        <h1 style="color: #0d9488; font-size: 24px; margin: 0 0 8px 0;">${title}</h1>
        <p style="color: #666; margin: 0 0 12px 0; font-size: 12px;">Generated by Makos.ai</p>
        <table style="margin: 0 auto; border-collapse: separate; border-spacing: 5px;">
          <tr>
            <td style="background: #e0f2f1; color: #00695c; padding: 4px 12px; border-radius: 15px; font-size: 11px; text-align: center;">${worksheet.subject}</td>
            <td style="background: #e0f2f1; color: #00695c; padding: 4px 12px; border-radius: 15px; font-size: 11px; text-align: center;">Grade ${worksheet.grade_level}</td>
            <td style="background: #e0f2f1; color: #00695c; padding: 4px 12px; border-radius: 15px; font-size: 11px; text-align: center;">${worksheet.difficulty}</td>
            <td style="background: #e0f2f1; color: #00695c; padding: 4px 12px; border-radius: 15px; font-size: 11px; text-align: center;">${worksheet.language.toUpperCase()}</td>
          </tr>
        </table>
      </div>

      ${showQuestions ? `
        <h2 style="font-size: 16px; color: #333; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 2px solid #0d9488;">Questions</h2>
        ${worksheet.questions.map((q, index) => `
          <div style="margin-bottom: 20px; padding: 15px; background: #fafafa; border-left: 4px solid #0d9488; border-radius: 6px; page-break-inside: avoid;">
            <table style="width: 100%; margin-bottom: 10px; border-collapse: collapse;">
              <tr>
                <td style="vertical-align: middle; padding: 0;">
                  <span style="display: inline-block; background: #0d9488; color: white; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-weight: bold; font-size: 12px; vertical-align: middle;">${index + 1}</span>
                  <span style="display: inline-block; background: #e0f2f1; color: #00695c; padding: 3px 10px; border-radius: 10px; font-size: 10px; font-weight: 600; vertical-align: middle; margin-left: 8px;">${getQuestionTypeLabel(q.type)}</span>
                </td>
                <td style="vertical-align: middle; text-align: right; padding: 0;">
                  <span style="display: inline-block; background: #0d9488; color: white; padding: 3px 10px; border-radius: 10px; font-size: 10px; font-weight: 600;">${getQuestionPoints(index)} pts</span>
                </td>
              </tr>
            </table>
            <p style="font-size: 14px; line-height: 1.5; margin-bottom: 10px; color: #333;">${renderText(q.question)}</p>
            ${renderImage(q.image)}
            ${renderOptions(q)}
          </div>
        `).join('')}
      ` : ''}

      ${showAnswerKey ? `
        <div style="margin-top: 30px; padding-top: 20px; border-top: 2px dashed #ccc; ${showQuestions ? 'page-break-before: always;' : ''}">
          <h2 style="color: #10b981; font-size: 18px; margin-bottom: 15px;">✅ Answer Key</h2>
          ${content === 'answer_key' ? `
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
              ${worksheet.questions.map((q, index) => `
                <div style="display: flex; align-items: center; gap: 6px; padding: 6px 10px; background: #ecfdf5; border-radius: 6px;">
                  <span style="font-weight: bold; color: #0d9488; font-size: 12px;">${index + 1}.</span>
                  <span style="color: #10b981; font-weight: 600; font-size: 11px;">${renderText(Array.isArray(q.correct_answer) ? q.correct_answer.join(', ') : String(q.correct_answer || ''))}</span>
                </div>
              `).join('')}
            </div>
          ` : `
            ${worksheet.questions.map((q, index) => `
              <div style="padding: 12px; background: #ecfdf5; border-radius: 6px; margin-bottom: 10px; page-break-inside: avoid;">
                <p style="margin: 0 0 6px 0; font-size: 13px;"><strong style="color: #0d9488;">${index + 1}.</strong> ${renderText(q.question)}</p>
                <p style="margin: 0; color: #10b981; font-weight: 600; font-size: 13px;">Answer: ${renderText(Array.isArray(q.correct_answer) ? q.correct_answer.join(', ') : String(q.correct_answer || ''))}</p>
                ${q.explanation ? `<p style="margin: 8px 0 0 0; font-size: 11px; color: #666; font-style: italic;">💡 ${renderText(q.explanation)}</p>` : ''}
              </div>
            `).join('')}
          `}
        </div>
      ` : ''}

      <!-- Footer -->
      <div style="margin-top: 30px; text-align: center; color: #999; font-size: 10px; padding-top: 15px; border-top: 1px solid #eee;">
        Created with Makos.ai - AI Worksheet Generator
      </div>
    </div>
  `;
}

function generatePdfContent(worksheet: Worksheet, content: 'questions' | 'answer_key' | 'both', title: string): string {
  const showQuestions = content === 'questions' || content === 'both';
  const showAnswerKey = (content === 'answer_key' || content === 'both') && worksheet.include_answer_key;

  // Calculate points per question (total = 100)
  const totalQuestions = worksheet.questions.length;
  const basePoints = Math.floor(100 / totalQuestions);
  const remainder = 100 - (basePoints * totalQuestions);
  const getQuestionPoints = (index: number): number => basePoints + (index < remainder ? 1 : 0);

  let html = `
    <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #0d9488;">
      <h1 style="color: #0d9488; font-size: 28px; margin: 0 0 10px 0;">${title}</h1>
      <p style="color: #666; margin: 0 0 15px 0;">Generated by Makos.ai</p>
      <div style="display: flex; justify-content: center; gap: 15px; flex-wrap: wrap;">
        <span style="background: #e0f2f1; color: #00695c; padding: 6px 16px; border-radius: 20px; font-size: 13px;">📚 ${worksheet.subject}</span>
        <span style="background: #e0f2f1; color: #00695c; padding: 6px 16px; border-radius: 20px; font-size: 13px;">📊 Grade ${worksheet.grade_level}</span>
        <span style="background: #e0f2f1; color: #00695c; padding: 6px 16px; border-radius: 20px; font-size: 13px;">⚡ ${worksheet.difficulty}</span>
        <span style="background: #e0f2f1; color: #00695c; padding: 6px 16px; border-radius: 20px; font-size: 13px;">🌐 ${worksheet.language.toUpperCase()}</span>
      </div>
    </div>
  `;

  if (showQuestions) {
    html += `<h2 style="font-size: 20px; color: #333; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #0d9488;">Questions</h2>`;

    worksheet.questions.forEach((q, index) => {
      const questionPoints = getQuestionPoints(index);
      html += `
        <div style="margin-bottom: 25px; padding: 20px; background: #f8fffe; border-left: 4px solid #0d9488; border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div>
              <span style="display: inline-block; background: #0d9488; color: white; width: 28px; height: 28px; border-radius: 50%; text-align: center; line-height: 28px; font-weight: bold; margin-right: 10px;">${index + 1}</span>
              <span style="background: #e0f2f1; color: #00695c; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">${getQuestionTypeLabel(q.type)}</span>
            </div>
            <span style="background: #0d9488; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">${questionPoints} pts</span>
          </div>
          <p style="font-size: 15px; line-height: 1.6; margin-bottom: 15px;">${q.question}</p>
          ${renderPdfQuestionInput(q)}
        </div>
      `;
    });
  }

  if (showAnswerKey) {
    html += `
      <div style="margin-top: 40px; padding-top: 30px; border-top: 2px dashed #ccc;">
        <h2 style="color: #10b981; font-size: 22px; margin-bottom: 20px;">✅ Answer Key</h2>
    `;

    if (content === 'answer_key') {
      html += `<div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px;">`;
      worksheet.questions.forEach((q, index) => {
        html += `
          <div style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #ecfdf5; border-radius: 8px;">
            <span style="font-weight: bold; color: #0d9488;">${index + 1}.</span>
            <span style="color: #10b981; font-weight: 600;">${Array.isArray(q.correct_answer) ? q.correct_answer.join(', ') : q.correct_answer}</span>
          </div>
        `;
      });
      html += `</div>`;
    } else {
      worksheet.questions.forEach((q, index) => {
        html += `
          <div style="padding: 15px; background: #ecfdf5; border-radius: 8px; margin-bottom: 12px;">
            <p style="margin: 0 0 8px 0;"><strong style="color: #0d9488;">${index + 1}.</strong> ${q.question}</p>
            <p style="margin: 0; color: #10b981; font-weight: 600;">Answer: ${Array.isArray(q.correct_answer) ? q.correct_answer.join(', ') : q.correct_answer}</p>
            ${q.explanation ? `<p style="margin: 10px 0 0 0; font-size: 13px; color: #666; font-style: italic;">💡 ${q.explanation}</p>` : ''}
          </div>
        `;
      });
    }

    html += `</div>`;
  }

  html += `
    <div style="margin-top: 40px; text-align: center; color: #999; font-size: 11px; padding-top: 20px; border-top: 1px solid #eee;">
      Created with Makos.ai - AI Worksheet Generator
    </div>
  `;

  return html;
}

function renderPdfQuestionInput(q: { type: string; options?: string[] }): string {
  switch (q.type) {
    case 'multiple_choice':
    case 'true_false':
      return q.options ? `
        <div style="margin-left: 20px;">
          ${q.options.map((opt, i) => `
            <table style="width: 100%; margin-bottom: 10px; background: white; border-radius: 8px; border-collapse: collapse;">
              <tr>
                <td style="width: 40px; padding: 10px; vertical-align: top; padding-top: 12px;">
                  <table style="width: 24px; height: 24px; border: 2px solid #0d9488; border-radius: 50%; border-collapse: collapse;">
                    <tr><td style="text-align: center; vertical-align: middle; font-size: 12px; font-weight: 600; color: #0d9488; padding: 0;">${String.fromCharCode(65 + i)}</td></tr>
                  </table>
                </td>
                <td style="padding: 10px 10px 10px 0; vertical-align: top; color: #333;">${opt}</td>
              </tr>
            </table>
          `).join('')}
        </div>
      ` : '';
    case 'fill_blank':
      return '<div style="margin-left: 20px; border-bottom: 2px dashed #0d9488; padding: 15px 0; margin-top: 10px;"></div>';
    case 'short_answer':
      return '<div style="margin-left: 20px; border: 2px dashed #ddd; border-radius: 8px; min-height: 80px; margin-top: 10px;"></div>';
    case 'essay':
      return '<div style="margin-left: 20px; border: 2px dashed #ddd; border-radius: 8px; min-height: 150px; margin-top: 10px;"></div>';
    default:
      return '';
  }
}

function generatePrintableHtml(worksheet: Worksheet, content: 'questions' | 'answer_key' | 'both', title: string): string {
  const showQuestions = content === 'questions' || content === 'both';
  const showAnswerKey = (content === 'answer_key' || content === 'both') && worksheet.include_answer_key;

  // Calculate points per question (total = 100)
  const totalQuestions = worksheet.questions.length;
  const basePoints = Math.floor(100 / totalQuestions);
  const remainder = 100 - (basePoints * totalQuestions);
  const getQuestionPoints = (index: number): number => basePoints + (index < remainder ? 1 : 0);

  return `<!DOCTYPE html>
<html lang="${worksheet.language}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            padding: 40px;
            background: white;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #0d9488;
        }
        h1 { color: #0d9488; font-size: 28px; margin-bottom: 10px; }
        .subtitle { color: #666; margin-bottom: 15px; }
        .info-bar {
            display: flex;
            justify-content: center;
            gap: 15px;
            flex-wrap: wrap;
        }
        .info-item {
            background: #e0f2f1;
            color: #00695c;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 13px;
        }
        .question {
            margin-bottom: 25px;
            padding: 20px;
            background: #f8fffe;
            border-left: 4px solid #0d9488;
            border-radius: 8px;
            page-break-inside: avoid;
        }
        .question-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }
        .question-num {
            display: inline-block;
            background: #0d9488;
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            text-align: center;
            line-height: 28px;
            font-weight: bold;
            margin-right: 10px;
        }
        .question-type {
            background: #e0f2f1;
            color: #00695c;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }
        .points {
            background: #0d9488;
            color: white;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }
        .question-text { font-size: 15px; line-height: 1.6; margin-bottom: 15px; }
        .options { margin-left: 20px; }
        .option {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 10px;
            padding: 10px;
            background: white;
            border-radius: 8px;
        }
        .option-letter {
            width: 24px;
            height: 24px;
            border: 2px solid #0d9488;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 600;
            color: #0d9488;
        }
        .blank-line {
            margin-left: 20px;
            border-bottom: 2px dashed #0d9488;
            padding: 15px 0;
            margin-top: 10px;
        }
        .text-box {
            margin-left: 20px;
            border: 2px dashed #ddd;
            border-radius: 8px;
            min-height: 80px;
            margin-top: 10px;
        }
        .essay-box {
            margin-left: 20px;
            border: 2px dashed #ddd;
            border-radius: 8px;
            min-height: 150px;
            margin-top: 10px;
        }
        .answer-key {
            margin-top: 40px;
            padding-top: 30px;
            border-top: 2px dashed #ccc;
            page-break-before: always;
        }
        .answer-key h2 { color: #10b981; font-size: 22px; margin-bottom: 20px; }
        .answer-item {
            padding: 15px;
            background: #ecfdf5;
            border-radius: 8px;
            margin-bottom: 12px;
            page-break-inside: avoid;
        }
        .answer-item strong { color: #0d9488; }
        .correct-answer { color: #10b981; font-weight: 600; margin-top: 5px; }
        .explanation { font-size: 13px; color: #666; margin-top: 10px; font-style: italic; }
        .footer {
            margin-top: 40px;
            text-align: center;
            color: #999;
            font-size: 11px;
            padding-top: 20px;
            border-top: 1px solid #eee;
        }
        @media print {
            body { padding: 20px; }
            .answer-key { page-break-before: always; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${title}</h1>
        <p class="subtitle">Generated by Makos.ai</p>
        <div class="info-bar">
            <span class="info-item">📚 ${worksheet.subject}</span>
            <span class="info-item">📊 Grade ${worksheet.grade_level}</span>
            <span class="info-item">⚡ ${worksheet.difficulty}</span>
            <span class="info-item">🌐 ${worksheet.language.toUpperCase()}</span>
        </div>
    </div>

    ${showQuestions ? worksheet.questions.map((q, index) => `
        <div class="question">
            <div class="question-header">
                <div>
                    <span class="question-num">${index + 1}</span>
                    <span class="question-type">${getQuestionTypeLabel(q.type)}</span>
                </div>
                <span class="points">${getQuestionPoints(index)} pts</span>
            </div>
            <p class="question-text">${q.question}</p>
            ${renderQuestionInputPrint(q)}
        </div>
    `).join('') : ''}

    ${showAnswerKey ? `
        <div class="answer-key">
            <h2>✅ Answer Key</h2>
            ${content === 'answer_key' ? `
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px;">
                    ${worksheet.questions.map((q, index) => `
                        <div style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #ecfdf5; border-radius: 8px;">
                            <span style="font-weight: bold; color: #0d9488;">${index + 1}.</span>
                            <span style="color: #10b981; font-weight: 600;">${Array.isArray(q.correct_answer) ? q.correct_answer.join(', ') : q.correct_answer}</span>
                        </div>
                    `).join('')}
                </div>
            ` : `
                ${worksheet.questions.map((q, index) => `
                    <div class="answer-item">
                        <p><strong>${index + 1}.</strong> ${q.question}</p>
                        <p class="correct-answer">Answer: ${Array.isArray(q.correct_answer) ? q.correct_answer.join(', ') : q.correct_answer}</p>
                        ${q.explanation ? `<p class="explanation">💡 ${q.explanation}</p>` : ''}
                    </div>
                `).join('')}
            `}
        </div>
    ` : ''}

    <div class="footer">
        Created with Makos.ai - AI Worksheet Generator
    </div>
</body>
</html>`;
}

function renderQuestionInputPrint(q: { type: string; options?: string[] }): string {
  switch (q.type) {
    case 'multiple_choice':
    case 'true_false':
      return q.options ? `
        <div class="options">
          ${q.options.map((opt, i) => `
            <div class="option">
              <span class="option-letter">${String.fromCharCode(65 + i)}</span>
              <span>${opt}</span>
            </div>
          `).join('')}
        </div>
      ` : '';
    case 'fill_blank':
      return '<div class="blank-line"></div>';
    case 'short_answer':
      return '<div class="text-box"></div>';
    case 'essay':
      return '<div class="essay-box"></div>';
    default:
      return '';
  }
}

// Keep old function for backward compatibility
function generatePdfHtml(worksheet: Worksheet, content: 'questions' | 'answer_key' | 'both' = 'both'): string {
  const showQuestions = content === 'questions' || content === 'both';
  const showAnswerKey = (content === 'answer_key' || content === 'both') && worksheet.include_answer_key;

  const title = content === 'answer_key' ? `${worksheet.title} - Answer Key` : worksheet.title;

  // Calculate points per question (total = 100)
  const totalQuestions = worksheet.questions.length;
  const basePoints = Math.floor(100 / totalQuestions);
  const remainder = 100 - (basePoints * totalQuestions);
  const getQuestionPoints = (index: number): number => basePoints + (index < remainder ? 1 : 0);

  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #333; padding: 20px; background: white;">
      <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #0d9488;">
        <h1 style="color: #0d9488; font-size: 28px; margin: 0 0 10px 0;">${title}</h1>
        <p style="color: #666; margin: 0 0 15px 0;">Generated by Makos.ai</p>
        <div style="display: flex; justify-content: center; gap: 15px; flex-wrap: wrap;">
          <span style="background: #e0f2f1; color: #00695c; padding: 6px 16px; border-radius: 20px; font-size: 13px;">📚 ${worksheet.subject}</span>
          <span style="background: #e0f2f1; color: #00695c; padding: 6px 16px; border-radius: 20px; font-size: 13px;">📊 Grade ${worksheet.grade_level}</span>
          <span style="background: #e0f2f1; color: #00695c; padding: 6px 16px; border-radius: 20px; font-size: 13px;">⚡ ${worksheet.difficulty}</span>
          <span style="background: #e0f2f1; color: #00695c; padding: 6px 16px; border-radius: 20px; font-size: 13px;">🌐 ${worksheet.language.toUpperCase()}</span>
        </div>
      </div>

      ${showQuestions ? `
        ${worksheet.questions.map((q, index) => `
          <div style="margin-bottom: 25px; padding: 20px; background: #f8fffe; border-left: 4px solid #0d9488; border-radius: 8px; page-break-inside: avoid;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div>
                <span style="display: inline-block; background: #0d9488; color: white; width: 28px; height: 28px; border-radius: 50%; text-align: center; line-height: 28px; font-weight: bold; margin-right: 10px;">${index + 1}</span>
                <span style="background: #e0f2f1; color: #00695c; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">${getQuestionTypeLabel(q.type)}</span>
              </div>
              <span style="background: #0d9488; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">${getQuestionPoints(index)} pts</span>
            </div>
            <p style="font-size: 15px; line-height: 1.6; margin-bottom: 15px;">${q.question}</p>
            ${renderQuestionInputPdf(q)}
          </div>
        `).join('')}
      ` : ''}

      ${showAnswerKey ? `
        <div style="margin-top: ${showQuestions ? '40px' : '0'}; padding-top: ${showQuestions ? '30px' : '0'}; ${showQuestions ? 'border-top: 2px dashed #ccc; page-break-before: always;' : ''}">
          <h2 style="color: #10b981; font-size: 22px; margin-bottom: 20px;">✅ Answer Key</h2>
          ${content === 'answer_key' ? `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px;">
              ${worksheet.questions.map((q, index) => `
                <div style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #ecfdf5; border-radius: 8px;">
                  <span style="font-weight: bold; color: #0d9488;">${index + 1}.</span>
                  <span style="color: #10b981; font-weight: 600;">${Array.isArray(q.correct_answer) ? q.correct_answer.join(', ') : q.correct_answer}</span>
                </div>
              `).join('')}
            </div>
          ` : `
            ${worksheet.questions.map((q, index) => `
              <div style="padding: 15px; background: #ecfdf5; border-radius: 8px; margin-bottom: 12px; page-break-inside: avoid;">
                <p style="margin: 0 0 8px 0;"><strong style="color: #0d9488;">${index + 1}.</strong> ${q.question}</p>
                <p style="margin: 0; color: #10b981; font-weight: 600;">Answer: ${Array.isArray(q.correct_answer) ? q.correct_answer.join(', ') : q.correct_answer}</p>
                ${q.explanation ? `<p style="margin: 10px 0 0 0; font-size: 13px; color: #666; font-style: italic;">💡 ${q.explanation}</p>` : ''}
              </div>
            `).join('')}
          `}
        </div>
      ` : ''}

      <div style="margin-top: 40px; text-align: center; color: #999; font-size: 11px; padding-top: 20px; border-top: 1px solid #eee;">
        Created with Makos.ai - AI Worksheet Generator
      </div>
    </div>
  `;
}

function renderQuestionInputPdf(q: { type: string; options?: string[] }): string {
  switch (q.type) {
    case 'multiple_choice':
    case 'true_false':
      return q.options ? `
        <div style="margin-left: 20px;">
          ${q.options.map((opt, i) => `
            <table style="width: 100%; margin-bottom: 10px; background: white; border-radius: 8px; border-collapse: collapse;">
              <tr>
                <td style="width: 40px; padding: 10px; vertical-align: top; padding-top: 12px;">
                  <table style="width: 24px; height: 24px; border: 2px solid #0d9488; border-radius: 50%; border-collapse: collapse;">
                    <tr><td style="text-align: center; vertical-align: middle; font-size: 12px; font-weight: 600; color: #0d9488; padding: 0;">${String.fromCharCode(65 + i)}</td></tr>
                  </table>
                </td>
                <td style="padding: 10px 10px 10px 0; vertical-align: top; color: #333;">${opt}</td>
              </tr>
            </table>
          `).join('')}
        </div>
      ` : '';
    case 'fill_blank':
      return '<div style="margin-left: 20px; border-bottom: 2px dashed #0d9488; padding: 15px 0; margin-top: 10px;"></div>';
    case 'short_answer':
      return '<div style="margin-left: 20px; border: 2px dashed #ddd; border-radius: 8px; min-height: 80px; margin-top: 10px;"></div>';
    case 'essay':
      return '<div style="margin-left: 20px; border: 2px dashed #ddd; border-radius: 8px; min-height: 150px; margin-top: 10px;"></div>';
    default:
      return '';
  }
}

export function exportToHtml(worksheet: Worksheet, content: 'questions' | 'answer_key' | 'both' = 'both'): void {
  const showQuestions = content === 'questions' || content === 'both';
  const showAnswerKey = (content === 'answer_key' || content === 'both') && worksheet.include_answer_key;
  const title = content === 'answer_key' ? `${worksheet.title} - Answer Key` : worksheet.title;

  // Calculate points per question (total = 100)
  const totalQuestions = worksheet.questions.length;
  const basePoints = Math.floor(100 / totalQuestions);
  const remainder = 100 - (basePoints * totalQuestions);
  const getQuestionPoints = (index: number): number => basePoints + (index < remainder ? 1 : 0);

  // Generate answers data for JavaScript
  const answersData = worksheet.questions.map((q, index) => ({
    id: q.id,
    index: index,
    type: q.type,
    correct_answer: q.correct_answer,
    points: getQuestionPoints(index)
  }));

  // Helper to render LaTeX and escape HTML
  const renderText = (text: string): string => {
    return renderLatexToHtml(text);
  };

  // Helper to render SVG images
  const renderImage = (image: string | undefined): string => {
    if (!image) return '';
    if (image.trim().startsWith('<svg')) {
      return `<div class="question-image">${image}</div>`;
    }
    return '';
  };

  const htmlContent = `<!DOCTYPE html>
<html lang="${worksheet.language}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <!-- KaTeX CSS for LaTeX rendering -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" crossorigin="anonymous">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            padding: 40px;
            background-color: #f8f9fa;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: #fff;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        h1 {
            color: #0d9488;
            text-align: center;
            margin-bottom: 8px;
            font-size: 28px;
        }
        .subtitle {
            text-align: center;
            color: #666;
            margin-bottom: 30px;
            font-size: 14px;
        }
        .info-bar {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin-bottom: 30px;
            flex-wrap: wrap;
        }
        .info-item {
            background: #e0f2f1;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 13px;
            color: #00695c;
        }
        .questions-header {
            font-size: 20px;
            color: #333;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #0d9488;
        }
        .question {
            margin-bottom: 25px;
            padding: 20px;
            background-color: #fafafa;
            border-left: 4px solid #0d9488;
            border-radius: 8px;
            transition: all 0.3s;
        }
        .question.correct { border-left-color: #10b981; background-color: #ecfdf5; }
        .question.incorrect { border-left-color: #ef4444; background-color: #fef2f2; }
        .question-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 12px;
        }
        .question-number {
            font-weight: 700;
            color: #0d9488;
            font-size: 16px;
        }
        .points-badge {
            background: #0d9488;
            color: white;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 12px;
        }
        .question-text {
            font-size: 15px;
            color: #333;
            margin-bottom: 15px;
        }
        .options { margin-left: 20px; }
        .options label {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
            padding: 8px 12px;
            background: white;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
            border: 2px solid transparent;
        }
        .options label:hover { background: #e0f2f1; }
        .options label.correct-option { background: #d1fae5; border-color: #10b981; }
        .options label.incorrect-option { background: #fee2e2; border-color: #ef4444; }
        .options input {
            width: 18px;
            height: 18px;
            accent-color: #0d9488;
        }
        .answer-input {
            width: 100%;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.2s;
        }
        .answer-input:focus {
            border-color: #0d9488;
            outline: none;
        }
        .answer-input.correct { border-color: #10b981; background: #ecfdf5; }
        .answer-input.incorrect { border-color: #ef4444; background: #fef2f2; }
        textarea.answer-input {
            min-height: 100px;
            resize: vertical;
        }
        .feedback {
            margin-top: 10px;
            padding: 10px;
            border-radius: 6px;
            font-size: 14px;
            display: none;
        }
        .feedback.show { display: block; }
        .feedback.correct { background: #d1fae5; color: #065f46; }
        .feedback.incorrect { background: #fee2e2; color: #991b1b; }
        .submit-btn {
            display: block;
            width: 100%;
            padding: 16px;
            background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 18px;
            font-weight: 600;
            cursor: pointer;
            margin-top: 30px;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .submit-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(13, 148, 136, 0.4);
        }
        .submit-btn:disabled {
            background: #9ca3af;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }
        .results-panel {
            margin-top: 30px;
            padding: 30px;
            background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);
            border-radius: 16px;
            color: white;
            text-align: center;
            display: none;
        }
        .results-panel.show { display: block; }
        .score-display {
            font-size: 48px;
            font-weight: 800;
            margin-bottom: 10px;
        }
        .score-details {
            font-size: 16px;
            opacity: 0.9;
        }
        .retry-btn {
            margin-top: 20px;
            padding: 12px 30px;
            background: white;
            color: #0d9488;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
        }
        .answer-key {
            margin-top: 50px;
            padding-top: 30px;
            border-top: 2px dashed #ddd;
        }
        .answer-key-toggle {
            display: flex;
            align-items: center;
            justify-content: space-between;
            cursor: pointer;
            padding: 15px 20px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            border-radius: 12px;
            margin-bottom: 20px;
            transition: all 0.3s;
        }
        .answer-key-toggle:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        }
        .answer-key-toggle h2 {
            margin: 0;
            font-size: 18px;
        }
        .toggle-icon {
            font-size: 20px;
            transition: transform 0.3s;
        }
        .toggle-icon.open {
            transform: rotate(180deg);
        }
        .answer-key-content {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.5s ease-out;
        }
        .answer-key-content.open {
            max-height: 5000px;
        }
        .answer-item {
            padding: 15px;
            background: #f0fff0;
            border-radius: 8px;
            margin-bottom: 12px;
        }
        .correct-answer {
            font-weight: 600;
            color: #10b981;
        }
        .explanation {
            font-size: 13px;
            color: #666;
            margin-top: 8px;
            font-style: italic;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            color: #999;
            font-size: 12px;
        }
        .question-image {
            display: flex;
            justify-content: center;
            margin: 15px 0;
        }
        .question-image svg {
            max-width: 100%;
            height: auto;
            max-height: 200px;
            border-radius: 8px;
            background: #f8fffe;
            padding: 10px;
        }
        /* KaTeX styling */
        .katex { font-size: 1.1em; }
        .katex-display { margin: 0.5em 0; }
        @media print {
            body { background: white; padding: 20px; }
            .container { box-shadow: none; padding: 20px; }
            .submit-btn, .results-panel, .retry-btn { display: none !important; }
            .answer-key { page-break-before: always; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${title}</h1>
        <p class="subtitle">Generated by Makos.ai</p>

        <div class="info-bar">
            <span class="info-item">📚 ${worksheet.subject}</span>
            <span class="info-item">📊 Grade ${worksheet.grade_level}</span>
            <span class="info-item">⚡ ${worksheet.difficulty}</span>
            <span class="info-item">🌐 ${worksheet.language.toUpperCase()}</span>
        </div>

        ${showQuestions ? `
        <h2 class="questions-header">Questions</h2>
        <form id="quizForm">
        ${worksheet.questions.map((q, index) => `
            <div class="question" id="question-${index}" data-index="${index}">
                <div class="question-header">
                    <span class="question-number">${index + 1}. ${getQuestionTypeLabel(q.type)}</span>
                    <span class="points-badge">${getQuestionPoints(index)} pts</span>
                </div>
                <p class="question-text">${renderText(q.question)}</p>
                ${renderImage(q.image)}
                ${renderInteractiveQuestionInputHtml(q, index, renderText)}
                <div class="feedback" id="feedback-${index}"></div>
            </div>
        `).join('')}

        <button type="button" class="submit-btn" id="submitBtn" onclick="evaluateQuiz()">
            📝 Submit & Check Answers
        </button>
        </form>

        <div class="results-panel" id="resultsPanel">
            <div class="score-display" id="scoreDisplay">0/100</div>
            <div class="score-details" id="scoreDetails">0 correct out of ${worksheet.questions.length} questions</div>
            <button class="retry-btn" onclick="resetQuiz()">🔄 Try Again</button>
        </div>
        ` : ''}

        ${showAnswerKey ? `
            <div class="answer-key" id="answerKey">
                ${content === 'answer_key' ? `
                    <h2 style="color: #10b981; margin-bottom: 20px; font-size: 20px;">✅ Answer Key</h2>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px;">
                        ${worksheet.questions.map((q, index) => `
                            <div style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #ecfdf5; border-radius: 8px;">
                                <span style="font-weight: bold; color: #0d9488;">${index + 1}.</span>
                                <span style="color: #10b981; font-weight: 600;">${renderText(Array.isArray(q.correct_answer) ? q.correct_answer.join(', ') : String(q.correct_answer || ''))}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="answer-key-toggle" onclick="toggleAnswerKey()">
                        <h2>✅ Answer Key (Click to ${content === 'both' ? 'reveal' : 'show'})</h2>
                        <span class="toggle-icon" id="toggleIcon">▼</span>
                    </div>
                    <div class="answer-key-content" id="answerKeyContent">
                        ${worksheet.questions.map((q, index) => `
                            <div class="answer-item">
                                <p><strong>${index + 1}.</strong> ${renderText(q.question)}</p>
                                <p class="correct-answer">Answer: ${renderText(Array.isArray(q.correct_answer) ? q.correct_answer.join(', ') : String(q.correct_answer || ''))}</p>
                                ${q.explanation ? `<p class="explanation">💡 ${renderText(q.explanation)}</p>` : ''}
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        ` : ''}

        <div class="footer">
            Created with Makos.ai - AI Worksheet Generator
        </div>
    </div>

    ${showQuestions ? `
    <script>
        const answers = ${JSON.stringify(answersData)};
        let submitted = false;

        function evaluateQuiz() {
            if (submitted) return;
            submitted = true;

            let correctCount = 0;
            let totalPoints = 0;
            let earnedPoints = 0;

            answers.forEach((answer, index) => {
                const questionEl = document.getElementById('question-' + index);
                const feedbackEl = document.getElementById('feedback-' + index);
                let userAnswer = '';
                let isCorrect = false;

                totalPoints += answer.points;

                if (answer.type === 'multiple_choice' || answer.type === 'true_false') {
                    const selected = document.querySelector('input[name="q' + index + '"]:checked');
                    userAnswer = selected ? selected.value : '';
                    isCorrect = userAnswer === answer.correct_answer;

                    // Highlight options
                    const labels = questionEl.querySelectorAll('.options label');
                    labels.forEach(label => {
                        const input = label.querySelector('input');
                        if (input.value === answer.correct_answer) {
                            label.classList.add('correct-option');
                        } else if (input.checked) {
                            label.classList.add('incorrect-option');
                        }
                    });
                } else if (answer.type === 'fill_blank' || answer.type === 'short_answer') {
                    const input = questionEl.querySelector('.answer-input');
                    userAnswer = input ? input.value.trim().toLowerCase() : '';
                    const correctAns = String(answer.correct_answer).toLowerCase();
                    isCorrect = userAnswer === correctAns;

                    if (input) {
                        input.classList.add(isCorrect ? 'correct' : 'incorrect');
                        input.disabled = true;
                    }
                } else {
                    // For essay and matching, just mark as reviewed
                    isCorrect = false;
                }

                if (isCorrect) {
                    correctCount++;
                    earnedPoints += answer.points;
                    questionEl.classList.add('correct');
                    feedbackEl.innerHTML = '✅ Correct!';
                    feedbackEl.className = 'feedback show correct';
                } else {
                    questionEl.classList.add('incorrect');
                    feedbackEl.innerHTML = '❌ Incorrect. Correct answer: <strong>' + answer.correct_answer + '</strong>';
                    feedbackEl.className = 'feedback show incorrect';
                }
            });

            // Calculate score out of 100
            const score = Math.round((earnedPoints / totalPoints) * 100);

            // Show results
            document.getElementById('submitBtn').disabled = true;
            document.getElementById('submitBtn').textContent = 'Quiz Submitted';
            document.getElementById('scoreDisplay').textContent = score + '/100';
            document.getElementById('scoreDetails').textContent = correctCount + ' correct out of ' + answers.length + ' questions';
            document.getElementById('resultsPanel').classList.add('show');

            // Scroll to results
            document.getElementById('resultsPanel').scrollIntoView({ behavior: 'smooth' });
        }

        function resetQuiz() {
            submitted = false;

            // Reset all questions
            answers.forEach((answer, index) => {
                const questionEl = document.getElementById('question-' + index);
                const feedbackEl = document.getElementById('feedback-' + index);

                questionEl.classList.remove('correct', 'incorrect');
                feedbackEl.className = 'feedback';
                feedbackEl.innerHTML = '';

                // Reset inputs
                const radios = questionEl.querySelectorAll('input[type="radio"]');
                radios.forEach(radio => radio.checked = false);

                const labels = questionEl.querySelectorAll('.options label');
                labels.forEach(label => {
                    label.classList.remove('correct-option', 'incorrect-option');
                });

                const inputs = questionEl.querySelectorAll('.answer-input');
                inputs.forEach(input => {
                    input.value = '';
                    input.disabled = false;
                    input.classList.remove('correct', 'incorrect');
                });
            });

            // Reset UI
            document.getElementById('submitBtn').disabled = false;
            document.getElementById('submitBtn').textContent = '📝 Submit & Check Answers';
            document.getElementById('resultsPanel').classList.remove('show');

            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        function toggleAnswerKey() {
            const content = document.getElementById('answerKeyContent');
            const icon = document.getElementById('toggleIcon');
            if (content && icon) {
                content.classList.toggle('open');
                icon.classList.toggle('open');
            }
        }
    </script>
    ` : ''}

</body>
</html>`;

  const filename = content === 'questions'
    ? `${worksheet.title.replace(/\s+/g, '_')}_questions.html`
    : content === 'answer_key'
    ? `${worksheet.title.replace(/\s+/g, '_')}_answer_key.html`
    : `${worksheet.title.replace(/\s+/g, '_')}.html`;

  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getQuestionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    multiple_choice: 'Multiple Choice',
    fill_blank: 'Fill in the Blank',
    true_false: 'True/False',
    short_answer: 'Short Answer',
    essay: 'Essay',
  };
  return labels[type] || type;
}

function renderQuestionInput(q: { type: string; options?: string[]; id: string }): string {
  switch (q.type) {
    case 'multiple_choice':
    case 'true_false':
      return q.options ? `
        <div class="options">
            ${q.options.map(opt => `
                <label>
                    <input type="radio" name="q${q.id}" value="${opt}">
                    <span>${opt}</span>
                </label>
            `).join('')}
        </div>
      ` : '';
    case 'fill_blank':
      return '<input type="text" class="answer-input" placeholder="Type your answer...">';
    case 'short_answer':
      return '<textarea class="answer-input" rows="3" placeholder="Write your answer..."></textarea>';
    case 'essay':
      return '<textarea class="answer-input" rows="6" placeholder="Write your essay..."></textarea>';
    default:
      return '';
  }
}

function renderInteractiveQuestionInput(q: { type: string; options?: string[]; id: string }, index: number): string {
  switch (q.type) {
    case 'multiple_choice':
    case 'true_false':
      return q.options ? `
        <div class="options">
            ${q.options.map(opt => `
                <label>
                    <input type="radio" name="q${index}" value="${opt}">
                    <span>${opt}</span>
                </label>
            `).join('')}
        </div>
      ` : '';
    case 'fill_blank':
      return '<input type="text" class="answer-input" placeholder="Type your answer...">';
    case 'short_answer':
      return '<textarea class="answer-input" rows="3" placeholder="Write your answer..."></textarea>';
    case 'essay':
      return '<textarea class="answer-input" rows="6" placeholder="Write your essay..."></textarea>';
    default:
      return '';
  }
}

// Version with LaTeX rendering for HTML export
function renderInteractiveQuestionInputHtml(q: { type: string; options?: string[]; id: string }, index: number, renderText: (text: string) => string): string {
  switch (q.type) {
    case 'multiple_choice':
    case 'true_false':
      return q.options ? `
        <div class="options">
            ${q.options.map(opt => {
              // Keep original value for form submission but render LaTeX for display
              const escapedOpt = opt.replace(/"/g, '&quot;');
              return `
                <label>
                    <input type="radio" name="q${index}" value="${escapedOpt}">
                    <span>${renderText(opt)}</span>
                </label>
              `;
            }).join('')}
        </div>
      ` : '';
    case 'fill_blank':
      return '<input type="text" class="answer-input" placeholder="Type your answer...">';
    case 'short_answer':
      return '<textarea class="answer-input" rows="3" placeholder="Write your answer..."></textarea>';
    case 'essay':
      return '<textarea class="answer-input" rows="6" placeholder="Write your essay..."></textarea>';
    default:
      return '';
  }
}

