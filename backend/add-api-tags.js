const fs = require('fs');
const path = require('path');

const controllers = [
  { file: 'src/users/users.controller.ts', tag: 'Users' },
  { file: 'src/notifications/controllers/notifications.controller.ts', tag: 'Notifications' },
  { file: 'src/export/controllers/export.controller.ts', tag: 'Export' },
  { file: 'src/generator/controllers/generator.controller.ts', tag: 'Generator' },
  { file: 'src/health/controllers/health.controller.ts', tag: 'Health' },
  { file: 'src/jira/controllers/jira.controller.ts', tag: 'Jira' },
  { file: 'src/dashboard/controllers/dashboard.controller.ts', tag: 'Dashboard' },
  { file: 'src/auth/auth.controller.ts', tag: 'Auth' },
  { file: 'src/audit/controllers/audit.controller.ts', tag: 'Audit Logs' },
  { file: 'src/chatbot/controllers/chatbot.controller.ts', tag: 'Chatbot' }
];

for (const { file, tag } of controllers) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    continue;
  }
  let content = fs.readFileSync(filePath, 'utf8');

  // Add the import
  if (content.includes('@nestjs/swagger')) {
    if (!content.includes('ApiTags')) {
      content = content.replace(/import\s+{([^}]*)}\s+from\s+['"]@nestjs\/swagger['"];/, (match, p1) => {
        return `import { ${p1.trim()}, ApiTags } from '@nestjs/swagger';`;
      });
    }
  } else {
    // Add import after @nestjs/common if possible, or at the top
    const importMatch = content.match(/import\s+{[^}]+}\s+from\s+['"]@nestjs\/common['"];/);
    if (importMatch) {
      content = content.replace(importMatch[0], `${importMatch[0]}\nimport { ApiTags } from '@nestjs/swagger';`);
    } else {
      content = `import { ApiTags } from '@nestjs/swagger';\n${content}`;
    }
  }

  // Add the decorator
  if (!content.includes(`@ApiTags('${tag}')`)) {
    content = content.replace(/@Controller\([^)]*\)/, `@ApiTags('${tag}')\n$&`);
  }

  fs.writeFileSync(filePath, content);
  console.log(`Updated ${file} with tag '${tag}'`);
}
