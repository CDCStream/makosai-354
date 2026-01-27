import { Worksheet, Question } from './types';

// Helper function to render LaTeX to HTML
function renderLatexToHtml(text: string): string {
  if (!text) return '';

  // Replace display math ($$...$$) with styled spans
  let result = text.replace(/\$\$(.*?)\$\$/g, (_, latex) => {
    return `<span style="display: block; text-align: center; margin: 10px 0; font-style: italic;">${latex}</span>`;
  });

  // Replace inline math ($...$) with styled spans
  result = result.replace(/\$([^$]+)\$/g, (_, latex) => {
    return `<span style="font-style: italic; font-family: 'Times New Roman', serif;">${latex}</span>`;
  });

  return result;
}

// Helper function to render question image (SVG or URL) for PDF
function renderImageHtml(image: string | undefined): string {
  if (!image) return '';

  if (image.trim().startsWith('<svg')) {
    // Force small size with inline styles on container
    return `<div style="text-align: center; margin: 8px auto; width: 150px; height: 120px; overflow: hidden; display: flex; align-items: center; justify-content: center;">
      <div style="width: 150px; height: 120px; display: flex; align-items: center; justify-content: center;">
        ${image.replace('<svg', '<svg style="max-width: 150px; max-height: 120px; width: auto; height: auto;"')}
      </div>
    </div>`;
  } else {
    return `<div style="text-align: center; margin: 8px 0;"><img src="${image}" style="max-width: 150px; max-height: 100px; border-radius: 6px;" /></div>`;
  }
}

// Helper function to render question image for HTML export (larger size)
function renderImageHtmlForExport(image: string): string {
  if (!image) return '';

  if (image.trim().startsWith('<svg')) {
    return `<div style="text-align: center; margin: 15px 0; max-width: 280px; margin-left: auto; margin-right: auto;">
      ${image.replace('<svg', '<svg style="max-width: 280px; max-height: 200px; width: 100%; height: auto;"')}
    </div>`;
  } else {
    return `<div style="text-align: center; margin: 15px 0;"><img src="${image}" style="max-width: 280px; max-height: 200px; border-radius: 8px;" /></div>`;
  }
}

// Helper function to render interactive question input with LaTeX support
function renderInteractiveQuestionInputWithLatex(q: { type: string; options?: string[]; id: string }, index: number): string {
  switch (q.type) {
    case 'multiple_choice':
    case 'true_false':
      return q.options ? `
        <div class="options">
            ${q.options.map(opt => `
                <label>
                    <input type="radio" name="q${index}" value="${opt}">
                    <span>${renderLatexToHtml(opt)}</span>
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

export async function exportToPdf(worksheet: Worksheet, content: 'questions' | 'answer_key' | 'both' = 'both'): Promise<void> {
  console.log('🚀 PDF Export started!', worksheet?.title);

  const title = content === 'questions'
    ? worksheet.title
    : content === 'answer_key'
    ? `${worksheet.title} - Answer Key`
    : worksheet.title;

  try {
    // Generate HTML content with proper styling
    const htmlContent = generatePrintableHtmlWithImages(worksheet, content, title);

    // Open in new window and trigger print
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      console.error('Pop-up blocked. Please allow pop-ups for this site.');
      throw new Error('Pop-up engelleyici aktif olabilir. Lütfen pop-up izni verin.');
    }

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Wait for content to load then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };

    console.log('✅ Print dialog opened!');

  } catch (error) {
    console.error('❌ PDF generation error:', error);
    throw new Error('PDF oluşturulamadı. Sayfayı yenileyip tekrar deneyin.');
  }
}

function generatePrintableHtmlWithImages(worksheet: Worksheet, content: 'questions' | 'answer_key' | 'both', title: string): string {
  const showQuestions = content === 'questions' || content === 'both';
  const showAnswerKey = (content === 'answer_key' || content === 'both') && worksheet.include_answer_key;

  // Calculate points per question (total = 100)
  const totalQuestions = worksheet.questions.length;
  const basePoints = Math.floor(100 / totalQuestions);
  const remainder = 100 - (basePoints * totalQuestions);
  const getQuestionPoints = (index: number): number => basePoints + (index < remainder ? 1 : 0);

  let questionsHtml = '';
  if (showQuestions) {
    questionsHtml = `
      <h2 style="font-size: 18px; color: #333; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #0d9488;">Questions</h2>
      ${worksheet.questions.map((q, index) => `
        <div style="margin-bottom: 25px; padding: 20px; background: #f8fffe; border-left: 4px solid #0d9488; border-radius: 8px; page-break-inside: avoid;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div>
              <span style="display: inline-block; background: #0d9488; color: white; width: 28px; height: 28px; border-radius: 50%; text-align: center; line-height: 28px; font-weight: bold; font-size: 14px; margin-right: 10px;">${index + 1}</span>
              <span style="background: #e0f2f1; color: #00695c; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">${getQuestionTypeLabel(q.type)}</span>
            </div>
            <span style="background: #0d9488; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">${getQuestionPoints(index)} pts</span>
          </div>
          <p style="font-size: 15px; line-height: 1.6; margin-bottom: 15px;">${renderLatexToHtml(q.question)}</p>
          ${renderImageHtml(q.image)}
          ${renderPdfQuestionOptions(q)}
        </div>
      `).join('')}
    `;
  }

  let answerKeyHtml = '';
  if (showAnswerKey) {
    answerKeyHtml = `
      <div style="margin-top: 40px; padding-top: 30px; border-top: 2px dashed #ccc; page-break-before: always;">
        <h2 style="color: #10b981; font-size: 20px; margin-bottom: 20px;">✅ Answer Key</h2>
        ${worksheet.questions.map((q, index) => `
          <div style="padding: 15px; background: #ecfdf5; border-radius: 8px; margin-bottom: 12px; page-break-inside: avoid;">
            <p style="margin: 0 0 8px 0; font-size: 14px;"><strong style="color: #0d9488;">${index + 1}.</strong> ${renderLatexToHtml(q.question.length > 80 ? q.question.substring(0, 80) + '...' : q.question)}</p>
            <p style="margin: 0; color: #10b981; font-weight: 600; font-size: 14px;">Answer: ${renderLatexToHtml(Array.isArray(q.correct_answer) ? q.correct_answer.join(', ') : String(q.correct_answer || ''))}</p>
            ${q.explanation ? `<p style="margin: 10px 0 0 0; font-size: 13px; color: #666; font-style: italic;">💡 ${renderLatexToHtml(q.explanation)}</p>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
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
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
    svg { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #0d9488;">
    <h1 style="color: #0d9488; font-size: 26px; margin: 0 0 10px 0;">${title}</h1>
    <p style="color: #666; margin: 0 0 15px 0; font-size: 13px;">Generated by Makos.ai</p>
    <div style="display: flex; justify-content: center; gap: 15px; flex-wrap: wrap;">
      <span style="background: #e0f2f1; color: #00695c; padding: 6px 16px; border-radius: 20px; font-size: 12px;">📚 ${worksheet.subject}</span>
      <span style="background: #e0f2f1; color: #00695c; padding: 6px 16px; border-radius: 20px; font-size: 12px;">📊 Grade ${worksheet.grade_level}</span>
      <span style="background: #e0f2f1; color: #00695c; padding: 6px 16px; border-radius: 20px; font-size: 12px;">⚡ ${worksheet.difficulty}</span>
    </div>
  </div>

  ${questionsHtml}
  ${answerKeyHtml}

  <div style="margin-top: 40px; text-align: center; color: #999; font-size: 11px; padding-top: 20px; border-top: 1px solid #eee;">
    Created with Makos.ai - AI Worksheet Generator
  </div>
</body>
</html>`;
}

function generatePdfHtmlWithImages(worksheet: Worksheet, content: 'questions' | 'answer_key' | 'both', title: string): string {
  const showQuestions = content === 'questions' || content === 'both';
  const showAnswerKey = (content === 'answer_key' || content === 'both') && worksheet.include_answer_key;

  // Calculate points per question (total = 100)
  const totalQuestions = worksheet.questions.length;
  const basePoints = Math.floor(100 / totalQuestions);
  const remainder = 100 - (basePoints * totalQuestions);
  const getQuestionPoints = (index: number): number => basePoints + (index < remainder ? 1 : 0);

  let html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #333; padding: 20px; background: white;">
      <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #0d9488;">
        <h1 style="color: #0d9488; font-size: 24px; margin: 0 0 10px 0;">${title}</h1>
        <p style="color: #666; margin: 0 0 15px 0; font-size: 12px;">Generated by Makos.ai</p>
        <div style="display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;">
          <span style="background: #e0f2f1; color: #00695c; padding: 4px 12px; border-radius: 12px; font-size: 11px;">📚 ${worksheet.subject}</span>
          <span style="background: #e0f2f1; color: #00695c; padding: 4px 12px; border-radius: 12px; font-size: 11px;">📊 Grade ${worksheet.grade_level}</span>
          <span style="background: #e0f2f1; color: #00695c; padding: 4px 12px; border-radius: 12px; font-size: 11px;">⚡ ${worksheet.difficulty}</span>
        </div>
      </div>
  `;

  if (showQuestions) {
    html += `<h2 style="font-size: 16px; color: #333; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 2px solid #0d9488;">Questions</h2>`;

    worksheet.questions.forEach((q, index) => {
      const questionPoints = getQuestionPoints(index);
      html += `
        <div style="margin-bottom: 20px; padding: 15px; background: #f8fffe; border-left: 4px solid #0d9488; border-radius: 8px; page-break-inside: avoid;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div>
              <span style="display: inline-block; background: #0d9488; color: white; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-weight: bold; font-size: 12px; margin-right: 8px;">${index + 1}</span>
              <span style="background: #e0f2f1; color: #00695c; padding: 3px 10px; border-radius: 10px; font-size: 10px; font-weight: 600;">${getQuestionTypeLabel(q.type)}</span>
            </div>
            <span style="background: #0d9488; color: white; padding: 3px 10px; border-radius: 10px; font-size: 10px; font-weight: 600;">${questionPoints} pts</span>
          </div>
          <p style="font-size: 13px; line-height: 1.5; margin-bottom: 10px;">${renderLatexToHtml(q.question)}</p>
          ${renderImageHtml(q.image)}
          ${renderPdfQuestionOptions(q)}
        </div>
      `;
    });
  }

  if (showAnswerKey) {
    html += `
      <div style="margin-top: 30px; padding-top: 20px; border-top: 2px dashed #ccc; page-break-before: always;">
        <h2 style="color: #10b981; font-size: 18px; margin-bottom: 15px;">✅ Answer Key</h2>
    `;

    worksheet.questions.forEach((q, index) => {
      html += `
        <div style="padding: 12px; background: #ecfdf5; border-radius: 8px; margin-bottom: 10px; page-break-inside: avoid;">
          <p style="margin: 0 0 6px 0; font-size: 12px;"><strong style="color: #0d9488;">${index + 1}.</strong> ${renderLatexToHtml(q.question.length > 80 ? q.question.substring(0, 80) + '...' : q.question)}</p>
          <p style="margin: 0; color: #10b981; font-weight: 600; font-size: 12px;">Answer: ${renderLatexToHtml(Array.isArray(q.correct_answer) ? q.correct_answer.join(', ') : String(q.correct_answer || ''))}</p>
          ${q.explanation ? `<p style="margin: 8px 0 0 0; font-size: 11px; color: #666; font-style: italic;">💡 ${renderLatexToHtml(q.explanation)}</p>` : ''}
        </div>
      `;
    });

    html += `</div>`;
  }

  html += `
      <div style="margin-top: 30px; text-align: center; color: #999; font-size: 10px; padding-top: 15px; border-top: 1px solid #eee;">
        Created with Makos.ai - AI Worksheet Generator
      </div>
    </div>
  `;

  return html;
}

function renderPdfQuestionOptions(q: Question): string {
  if ((q.type === 'multiple_choice' || q.type === 'true_false') && q.options) {
    return `
      <div style="margin-left: 15px;">
        ${q.options.map((opt, i) => `
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px; padding: 8px; background: white; border-radius: 6px;">
            <span style="width: 20px; height: 20px; border: 2px solid #0d9488; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 600; color: #0d9488;">${String.fromCharCode(65 + i)}</span>
            <span style="color: #333; font-size: 12px;">${renderLatexToHtml(opt)}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  if (q.type === 'fill_blank') {
    return '<div style="margin-left: 15px; border-bottom: 2px dashed #0d9488; padding: 12px 0; margin-top: 8px;"></div>';
  }

  if (q.type === 'short_answer') {
    return '<div style="margin-left: 15px; border: 2px dashed #ddd; border-radius: 8px; min-height: 60px; margin-top: 8px;"></div>';
  }

  if (q.type === 'essay') {
    return '<div style="margin-left: 15px; border: 2px dashed #ddd; border-radius: 8px; min-height: 100px; margin-top: 8px;"></div>';
  }

  return '';
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
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px; padding: 10px; background: white; border-radius: 8px;">
              <span style="width: 24px; height: 24px; border: 2px solid #0d9488; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; color: #0d9488;">${String.fromCharCode(65 + i)}</span>
              <span style="color: #333;">${opt}</span>
            </div>
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
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px; padding: 10px; background: white; border-radius: 8px;">
              <span style="width: 24px; height: 24px; border: 2px solid #0d9488; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; color: #0d9488;">${String.fromCharCode(65 + i)}</span>
              <span style="color: #333;">${opt}</span>
            </div>
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

  const htmlContent = `<!DOCTYPE html>
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
                <p class="question-text">${renderLatexToHtml(q.question)}</p>
                ${q.image ? renderImageHtmlForExport(q.image) : ''}
                ${renderInteractiveQuestionInputWithLatex(q, index)}
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

        ${showAnswerKey && content !== 'questions' ? `
            <div class="answer-key" id="answerKey">
                ${content === 'answer_key' ? `
                    <h2 style="color: #10b981; margin-bottom: 20px; font-size: 20px;">✅ Answer Key</h2>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px;">
                        ${worksheet.questions.map((q, index) => `
                            <div style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #ecfdf5; border-radius: 8px;">
                                <span style="font-weight: bold; color: #0d9488;">${index + 1}.</span>
                                <span style="color: #10b981; font-weight: 600;">${renderLatexToHtml(Array.isArray(q.correct_answer) ? q.correct_answer.join(', ') : String(q.correct_answer || ''))}</span>
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
                                <p><strong>${index + 1}.</strong> ${q.question}</p>
                                <p class="correct-answer">Answer: ${Array.isArray(q.correct_answer) ? q.correct_answer.join(', ') : q.correct_answer}</p>
                                ${q.explanation ? `<p class="explanation">💡 ${q.explanation}</p>` : ''}
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
                    // For essay, just mark as reviewed
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

    ${!showQuestions && showAnswerKey && content === 'both' ? `
    <script>
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

