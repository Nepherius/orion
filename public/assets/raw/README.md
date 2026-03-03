# CSV Data Source Files

This folder contains raw CSV data files extracted from http://www.entropiawiki.com/ and used to generate JSON asset files.

## Input Format

CSV files are downloaded from Entropia Wiki and must be renamed according to the expected naming convention:

| Expected Filename                       | Source                          | Required |
| --------------------------------------- | ------------------------------- | -------- |
| `creatures0.csv`, `creatures1.csv`, ... | Creatures wiki pages (2+ files) | Optional |
| `FAP.csv`                               | FAP/Medical Tools wiki          | Optional |
| `Armor.csv`                             | Armor wiki                      | Optional |

The naming convention is critical for the extraction script to identify and process file types correctly.

### Expected CSV Format

Creatures files (typically come from multiple wiki pages):

```
creature_name;level;planet_name;...
Atrox Adolescent;1;Port Atlantis;
```

FAP.csv (Medical tools):

```
Name;...;Max.TT;Markup;Decay;ME;...
Medical Tool Name;...;9;;0.01;0;...
```

Armor.csv (Armor items):

```
armor_name;...
Pixie Armor;
```

Separate columns with semicolons (;) as delimiter.

## Output

Run the extraction script to generate JSON files:

```bash
node scripts/wiki_csv_extract.cjs
```

Generated output files:

- `public/assets/creatures/creatures.json` - Unique creatures extracted from all creatures\*.csv files
- `public/assets/planets/planets.json` - Unique planets extracted from creatures data
- `public/assets/medical/medicaltool.json` - Medical tools from FAP.csv with fields: `name`, `type` (lowercase or null), `tt`, `markup` (number or null), `decay`, `me`, `mecost` (cost per 1 ME, default 0)
- `public/assets/armor/armor.json` - Unique armor items from Armor.csv

Each output includes extraction timestamp and item count.

## Notes

- Files are optional. The script processes only files that exist and skips missing ones.
- Creatures data typically spans multiple files (e.g., creatures0.csv, creatures1.csv). Add as many as needed using sequential numbering.
- All extracted lists are deduplicated and sorted alphabetically (medical tools sorted by `name`).
- Check console output for extraction status and summary.
