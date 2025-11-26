# 🚨 Quick Fix: Coördinaten Toevoegen aan Meldingen

## Probleem
Je hebt 2 meldingen maar ze hebben **geen coördinaten** omdat ze zonder adres zijn aangemaakt.

## ✅ Oplossing: Voeg Adres Toe

### Voor Bestaande Meldingen:

**Melding 1:**
1. Open GMS2: http://localhost:5173/gms2
2. **Klik op melding #1** in de lijst (om te selecteren)
3. **Kladblok onderaan** → Type: `=Rotterdam/Coolsingel 40`
4. **Druk Enter** (je ziet velden automatisch invullen)
5. **Klik "Update"** knop rechtsboven
6. ✅ Klaar!

**Melding 2:**
1. **Klik op melding #2** in de lijst
2. **Kladblok** → Type: `=Amsterdam/Dam 1`
3. **Druk Enter**
4. **Klik "Update"**
5. ✅ Klaar!

**Check resultaat:**
- Ga naar: http://localhost:5173/kaart
- Je zou nu 2 pins moeten zien!

### Voor Nieuwe Meldingen:

**Altijd adres EERST invullen:**

1. GMS2 → **"Nieuw"** knop
2. **Kladblok** → `=Rotterdam/Kleiweg 12` → Enter (wacht tot ingevuld)
3. **Kladblok** → `-inbraak` → Enter (classificatie)
4. **"Uitgifte"** knop
5. ✅ Melding heeft nu automatisch coördinaten!

## 🔍 Verificatie

**Check in Browser Console (F12):**
```
📍 Coördinaten opgeslagen: [4.4777, 51.9244]
```

**Check op Kaart:**
- Oranje waarschuwing weg?
- Pin zichtbaar op kaart?
- Klik op pin → zie details?

## 💡 Tips

- **Gebruik altijd** `=stad/straat nummer` in kladblok
- **Wacht** tot adres is ingevuld voordat je Update/Uitgifte klikt
- **Locatietreffers tab** toont zoekresultaten
- **Console** toont of coördinaten zijn opgeslagen

## 🛠️ Als het nog steeds niet werkt:

1. Check server draait: `http://localhost:5000/api/bag/test`
2. Check frontend draait: `http://localhost:5173/gms2`
3. Check console errors (F12)
4. Probeer server herstarten: Ctrl+C en `npm run dev`

