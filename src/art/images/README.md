# Character images

Low-poly renders of the original character designs, one per art slot. They
are generated, not hand-edited:

```bash
npm run art                 # regenerate every slot
node scripts/generate-art.mjs wolf goblin   # regenerate selected slots
```

Designs live in `scripts/art/characters.mjs`; the triangulation, shading and
PNG encoding live in `scripts/generate-art.mjs`. Shadow versions are tinted
in the app, so each slot needs only one image.

| File | Used for |
|---|---|
| `hunter` | The player |
| `soldier` | Shadow soldiers, Shadow Legion |
| `goblin`, `hobgoblin` | Goblin Den |
| `wolf` | Wolf Forest, the Fang shadow |
| `kasaka` | Kasaka's Nest (giant serpent) |
| `knight` | Knights, Iron Vault, the Iron shadow |
| `commander` | Hall of Knights boss, the Igris shadow |
| `bear` | Frozen Forest boss, the Tank shadow |
| `orc` | High Orc Fortress, the Tusk shadow |
| `demon` | Demon King's Castle, ice elves |
| `wyvern` | Wyvern Peak, the Kaisel shadow |
| `ant` | Jeju Island, the Beru shadow |
| `centipede` | Penalty Zone |
| `statue` | Monarch's Domain, the Bellion shadow |
