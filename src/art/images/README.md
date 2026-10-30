# Character images

Each file here is an **ink layer**: white lines on a transparent
background, named after a character slot. It replaces that slot's
silhouette everywhere in the app, and the app tints it per variant (blue
hunter, red enemy, purple shadow) and adds the glow.

Make one from a public-domain engraving:

```bash
python3 scripts/process-engraving.py scan.jpg src/art/images/wolf.png --crop 0.1,0.2,0.9,1
```

`--crop` takes fractions of the image (x0,y0,x1,y1) to isolate one figure;
`--flip` mirrors it. Restart `npm run dev` after adding a file.

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

**This repository is public.** Only add art you have the right to
redistribute (for example CC0 or CC-BY), and list it in `CREDITS.md`.
