import codecs

# Read file
with codecs.open('lib/utils.ts', 'r', 'utf-8', errors='replace') as f:
    content = f.read()

# Replace the problematic lines
content = content.replace(
    "fmtMeal('', 'Lanche da tarde', data.afternoonSnackStatus",
    "fmtMeal('🥪', 'Lanche da tarde', data.afternoonSnackStatus"
)
content = content.replace(
    "fmtMeal('', 'Janta', data.dinnerStatus",
    "fmtMeal('🌙', 'Janta', data.dinnerStatus"
)

# Write back
with codecs.open('lib/utils.ts', 'w', 'utf-8') as f:
    f.write(content)

print('Done!')
