import fs from 'fs';
import path from 'path';

const MODELS_DIR = path.resolve(__dirname, '..', 'models');

type Duplicate = {
  file: string;
  field: string;
};

const findInlineIndexedFields = (content: string): Set<string> => {
  const set = new Set<string>();
  const matches = content.matchAll(/^[\t ]*([a-zA-Z_][\w]*)\s*:\s*\{[^\n]*\bindex\s*:\s*true/gsm);
  for (const match of matches) {
    set.add(match[1]);
  }
  return set;
};

const findSchemaIndexedFields = (content: string): Set<string> => {
  const set = new Set<string>();
  const matches = content.matchAll(/\.index\(\s*\{\s*([a-zA-Z_][\w]*)\s*:/g);
  for (const match of matches) {
    set.add(match[1]);
  }
  return set;
};

const run = (): void => {
  const files = fs.readdirSync(MODELS_DIR).filter((file) => file.endsWith('.ts'));
  const duplicates: Duplicate[] = [];

  for (const file of files) {
    const fullPath = path.join(MODELS_DIR, file);
    const content = fs.readFileSync(fullPath, 'utf8');

    const inlineFields = findInlineIndexedFields(content);
    const schemaFields = findSchemaIndexedFields(content);

    for (const field of inlineFields) {
      if (schemaFields.has(field)) {
        duplicates.push({ file, field });
      }
    }
  }

  if (!duplicates.length) {
    console.log('[QUALITY] Duplicate mongoose indexes: OK');
    return;
  }

  console.error('[QUALITY] Duplicate mongoose indexes found:');
  duplicates.forEach((item) => {
    console.error(`- ${item.file}: field "${item.field}" indexed both inline and schema.index()`);
  });
  process.exit(1);
};

run();
