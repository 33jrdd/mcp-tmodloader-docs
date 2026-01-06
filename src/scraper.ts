
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

const DOCS_BASE_URL = 'https://docs.tmodloader.net/docs/stable/';
const ANNOTATED_URL = 'https://docs.tmodloader.net/docs/stable/annotated.html';

export interface ClassInfo {
    name: string;
    fullName: string;
    description: string;
    url: string;
}

let cachedClasses: ClassInfo[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

export async function fetchClasses(): Promise<ClassInfo[]> {
    if (cachedClasses && (Date.now() - lastFetchTime < CACHE_DURATION)) {
        return cachedClasses;
    }

    console.error('Fetching tModLoader documentation...');
    const response = await fetch(ANNOTATED_URL);
    if (!response.ok) {
        throw new Error(`Failed to fetch docs: ${response.statusText}`);
    }
    const html = await response.text();
    const $ = cheerio.load(html);

    const classes: ClassInfo[] = [];
    const stack: string[] = [];

    // Iterate over rows in the directory table
    $('table.directory tr').each((_, el) => {
        const row = $(el);
        const entry = row.find('td.entry');

        // Determine indentation level based on the first span's width or style
        // The first span usually handles indentation
        const spacer = entry.find('span').first();
        const style = spacer.attr('style') || '';
        const widthMatch = style.match(/width:(\d+)px/);
        let width = 0;
        if (widthMatch) {
            width = parseInt(widthMatch[1], 10);
        }

        // Assuming 16px per level. 
        // Level 1: 0px or 16px? 
        // In the inspection:
        // Row 2: width:32px (Entry inside AbstractNPCShop?)
        // Row 3: width:16px (AccessorySlotLoader)
        // Row 4: width:16px (Achievement)
        // It seems 16px is the top level? Or 0px?
        // Let's assume level = width / 16.
        // If 16px is level 1, then 32px is level 2.

        const level = Math.max(1, width / 16);

        // Adjust stack
        while (stack.length >= level) {
            stack.pop();
        }

        const link = entry.find('a.el');
        if (link.length === 0) return;

        const name = link.text().trim();
        const href = link.attr('href');
        const fullUrl = href ? new URL(href, DOCS_BASE_URL).toString() : '';

        // Description is the text directly in td.entry, ignoring the child elements we processed
        // A simple way is to clone, remove known children, and get text
        const entryClone = entry.clone();
        entryClone.find('span').remove(); // Remove icons/spacers
        entryClone.find('a').remove();    // Remove the link (name)
        // Sometimes there are other small spans or characters, but this should be close enough
        const description = entryClone.text().trim().replace(/^\s*[:\-]\s*/, ''); // Remove leading separator if any

        stack.push(name);

        classes.push({
            name,
            fullName: stack.join('.'), // This might verify nested classes
            description,
            url: fullUrl
        });
    });

    cachedClasses = classes;
    lastFetchTime = Date.now();
    console.error(`Parsed ${classes.length} classes.`);
    return classes;
}


export async function searchClasses(query: string): Promise<ClassInfo[]> {
    const classes = await fetchClasses();
    const q = query.toLowerCase();

    // Simple basic scoring/filtering
    return classes.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.fullName.toLowerCase().includes(q)
    ).slice(0, 20); // Limit results
}

export async function fetchClassDocs(url: string): Promise<string> {
    console.error(`Fetching class docs from ${url}...`);
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch docs: ${response.statusText}`);
    }
    const html = await response.text();
    const $ = cheerio.load(html);

    // Doxygen content is usually in specific divs
    // We want to avoid headers/sidebars
    // Usually .contents or .textblock

    let content = $('.contents').html() || $('.textblock').html() || $('body').html() || '';

    // Remove scripts and styles
    const $content = cheerio.load(content);
    $content('script').remove();
    $content('style').remove();
    $content('.footer').remove(); // remove footer if present

    const turndownService = new TurndownService();
    // Configure to keep tables if needed, or other elements
    // turndownService.addRule(...)

    return turndownService.turndown($content.html() || '');
}
