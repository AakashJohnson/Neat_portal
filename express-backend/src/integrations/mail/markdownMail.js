// Renders Laravel "markdown mailables" (@component('mail::message')) to the
// same HTML: resources/views/vendor/mail/html/{layout,header,footer,table,
// button,panel}.blade.php with the project's themes/default.css inlined.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Marked } from 'marked';
import juice from 'juice';

const css = readFileSync(path.resolve(import.meta.dirname, '../../../assets/mail/default.css'), 'utf8');
const marked = new Marked({ gfm: true, breaks: false });

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };

/** Blade {{ $value }}: htmlspecialchars with ENT_QUOTES. */
export const e = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ENTITIES[c]);

const md = (source) => marked.parse(source);

/** @component('mail::table') */
export const table = (markdownTable) => `<div class="table">\n${md(markdownTable)}\n</div>`;

/** @component('mail::button', ['url' => ..., 'color' => ...]) */
export const button = (url, label, color = 'brand') => `<table class="action" align="center" width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr><td align="center"><table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
    <tr><td align="center"><table border="0" cellpadding="0" cellspacing="0" role="presentation">
    <tr><td><a href="${e(url)}" class="button button-${e(color)}" target="_blank">${e(label)}</a></td></tr>
    </table></td></tr></table></td></tr>
</table>`;

/** @component('mail::panel') */
export const panel = (markdown) => `<table class="panel" width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr><td class="panel-content"><table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr><td class="panel-item">${md(markdown)}</td></tr></table></td></tr>
</table>`;

/**
 * Markdown mailables whose view is plain HTML (no mail::message component):
 * Laravel renders the view as-is and only inlines the theme CSS.
 */
export function renderRawHtml(html) {
  const text = html.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return { html: juice.inlineContent(html, css), text };
}

/**
 * Wraps a mail::message body in the Laravel layout.
 * @param {string} bodyMarkdown markdown (may contain inline HTML from the components above)
 * @param {{ appUrl: string, appName?: string, year?: number }} opts
 * @returns {{ html: string, text: string }}
 */
export function renderMessage(bodyMarkdown, { appUrl, appName = 'NEAT', year = new Date().getUTCFullYear() }) {
  const logo = `<img src="${e(`${appUrl.replace(/\/$/, '')}/assets/img/neat-logo.png`)}" alt="${e(appName)}" height="50">`;
  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
</head>
<body>
    <style>
        @media only screen and (max-width: 600px) { .inner-body { width: 100% !important; } .footer { width: 100% !important; } }
        @media only screen and (max-width: 500px) { .button { width: 100% !important; } }
    </style>
    <table class="wrapper" width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr><td align="center">
            <table class="content" width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr><td class="header"><a href="${e(appUrl)}">${logo}</a></td></tr>
                <tr><td class="body" width="100%" cellpadding="0" cellspacing="0">
                    <table class="inner-body" align="center" width="570" cellpadding="0" cellspacing="0" role="presentation">
                        <tr><td class="content-cell">
${md(bodyMarkdown)}
                        </td></tr>
                    </table>
                </td></tr>
                <tr><td>
                    <table class="footer" align="center" width="570" cellpadding="0" cellspacing="0" role="presentation">
                        <tr><td class="content-cell" align="center">${md(`© ${year} ${e(appName)}. All rights reserved.`)}</td></tr>
                    </table>
                </td></tr>
            </table>
        </td></tr>
    </table>
</body>
</html>`;

  // Laravel's text part is the markdown source with HTML stripped.
  const text = bodyMarkdown.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n').trim();
  return { html: juice.inlineContent(html, css), text };
}
