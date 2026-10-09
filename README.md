# Web MOstavTY

Statický web stavební firmy — čisté HTML, CSS a JavaScript. Žádný build,
žádné npm, žádný framework. Soubory stačí nahrát na hosting a web funguje.

## Jak si web prohlédnout

Otevřete `index.html` dvojklikem v prohlížeči. Funguje i takto, ale kvůli
formuláři a správným cestám je lepší spustit malý lokální server:

```bash
# Python (máte ho nainstalovaný)
python -m http.server 8000
```

Pak otevřete <http://localhost:8000>.

## Co je potřeba doplnit před spuštěním

Všechna místa jsou v kódu označená komentářem `TODO`. Najdete je takto:

```bash
grep -rn "TODO" --include="*.html" --include="*.js" .
```

### 1. Kontaktní údaje (povinné)

V kódu jsou zástupné hodnoty, které se opakují ve všech stránkách.
Nejrychleji je vyměníte hromadně:

```bash
# Telefon — pozor, je na dvou místech: v textu a v href="tel:"
grep -rl "420123456789" --include="*.html" . | xargs sed -i 's/+420123456789/+420VASECISLO/g'
grep -rl "420 123 456 789" --include="*.html" . | xargs sed -i 's/+420 123 456 789/+420 VASE CISLO/g'

# E-mail
grep -rl "info@mostavty.cz" --include="*.html" . | xargs sed -i 's/info@mostavty.cz/vas@email.cz/g'
```

Dále ručně projděte a doplňte:

- **adresu** (`Ulice 123, 586 01 Jihlava`),
- **IČO a DIČ** (`00000000`),
- **spisovou značku** na stránce [kontakt.html](kontakt.html),
- **otevírací hodiny**, pokud se liší,
- **doménu** v `robots.txt`, `sitemap.xml` a v `<link rel="canonical">`
  a `og:url` v hlavičkách stránek.

### 2. Formulář (povinné, aby fungoval)

Formulář odesílá přes [Web3Forms](https://web3forms.com) — zdarma, bez
registrace serveru, do 250 zpráv měsíčně.

1. Jděte na <https://web3forms.com>, zadejte svůj e-mail.
2. Přijde vám **Access Key**.
3. Vložte ho do [js/main.js](js/main.js) na řádek s `WEB3FORMS_KEY`.

Dokud klíč nevložíte, formulář běží v **testovacím režimu**: zvaliduje
vstupy, ale nic neodešle — data vypíše do konzole prohlížeče (F12).
To je záměr, aby se neztrácely poptávky kvůli nenastavené službě.

### 3. Fotky (velmi důležité)

Tohle je na webu stavební firmy to, co nejvíc rozhoduje.

**Web má zatím ilustrační fotky** — hero na úvodu, 9 realizací v galerii
a fotky na podstránkách služeb. Jsou stažené z [Unsplash](https://unsplash.com)
pod [Unsplash License](https://unsplash.com/license), která dovoluje
i komerční použití bez uvedení autora. Pro školní projekt stačí, pro ostrý
provoz je nahraďte vlastními — zákazník pozná fotobanku od skutečné práce.

Portréty v sekci týmu na [o-nas.html](o-nas.html) vygeneroval model
StyleGAN2 ([thispersondoesnotexist.com](https://thispersondoesnotexist.com)).
Nejsou to skuteční lidé, takže nikoho nezobrazují.

Kde fotky vyměnit:

| Co | Soubor |
|---|---|
| Hero na úvodu | `img/hero-rekonstrukce.jpg` (1920×1080) |
| Galerie realizací | `img/reference/*.jpg` (800×600) |
| Podstránky služeb | `img/sluzby/*.jpg` (640×800) |
| Tým | `img/tym/*.jpg` (600×750) |

Stačí přepsat soubor stejným názvem — v HTML se nic měnit nemusí. Jen
nezapomeňte upravit `alt` popisky, aby odpovídaly nové fotce.

Kam je nahrát:

| Složka | Co tam patří |
|---|---|
| `img/` | hero fotka na úvodu, náhled pro sdílení (og-nahled.jpg) |
| `img/reference/` | fotky dokončených zakázek |
| `img/sluzby/` | ilustrační fotky jednotlivých služeb |

Doporučení k fotkám:

- **rozměr** max 1600 px na delší straně (hero 1920 px),
- **formát** JPG, kvalita ~80 %, nebo WebP,
- **velikost** do 300 kB na fotku — jinak se web načítá pomalu,
- zmenšit je můžete například na <https://squoosh.app> (zdarma, v prohlížeči).

Jak fotku vložit do galerie referencí: v [reference.html](reference.html)
je přímo v kódu vzorový blok s komentářem — stačí ho zkopírovat a upravit.

Vždy vyplňte atribut `alt` — popisuje, co je na fotce, lidem, kteří ji
nevidí, a pomáhá i ve vyhledávání.

### 4. Texty

Texty jsou napsané jako věrohodný základ pro středně velkou stavební firmu,
ale **nejsou to vaše skutečná čísla**. Projděte zejména:

- **čísla ve statistikách** (let na trhu, počet zakázek, lidí v týmu) —
  jsou v `index.html` a `o-nas.html` v atributu `data-count`,
- **orientační ceny** v sekci FAQ a na podstránkách služeb,
- **délku záruky** (uvedeno 60 měsíců),
- **příběh firmy** na [o-nas.html](o-nas.html) — autentický text funguje
  mnohem lépe než obecné fráze,
- **členy týmu** — jména a pozice,
- **doklady a pojištění** na [o-nas.html](o-nas.html) — nepište nic, co
  nemůžete doložit,
- **sekci „Co neděláme"** na [sluzby.html](sluzby.html),
- **reference zákazníků** — zveřejňujte je jen se souhlasem zákazníka.

### 5. GDPR

[ochrana-osobnich-udaju.html](ochrana-osobnich-udaju.html) je **šablona**,
ne hotový právní dokument. Projděte ji, doplňte své údaje a smažte oranžový
rámeček s poznámkou pro majitele webu.

Pokud později přidáte analytiku (Google Analytics), mapu přes `iframe`
nebo reklamní pixel, budete navíc potřebovat **cookie lištu se souhlasem** —
současný text počítá s tím, že web žádné cookies neukládá.

### 6. Favicon

Momentálně je favicon vložená přímo v kódu jako malé SVG (oranžový
čtvereček s „M"). Vlastní si můžete vygenerovat na
<https://realfavicongenerator.net> a nahradit řádek `<link rel="icon" ...>`.

## Interní stránka s inzeráty

Soubor [inzeraty-interni.html](inzeraty-interni.html) obsahuje pět hotových
inzerátů (Facebook + Bazoš) včetně fotek ve správných rozměrech. Otevřete ho
přímým zadáním adresy:

```
https://www.mostavty.cz/inzeraty-interni.html
```

Stránka **není nikde prolinkovaná**, není v `sitemap.xml`, má v hlavičce
`noindex` a je zakázaná v `robots.txt`.

Jde ale o zastření, ne o zabezpečení — **kdo adresu zná, otevře si ji.**
Adresa je navíc uvedená v `robots.txt`, který je veřejně čitelný. Pokud by
stránka měla být opravdu chráněná, je potřeba heslo na úrovni hostingu
(basic auth / `.htaccess`), nebo ji na web vůbec nenahrávat a otevírat si ji
jen lokálně v počítači.

## Nasazení

Web je statický, takže funguje na jakémkoli hostingu. Nejjednodušší varianty:

| Služba | Cena | Jak |
|---|---|---|
| **Netlify** | zdarma | přetáhnete složku do okna prohlížeče |
| **Vercel** | zdarma | stejně jako Netlify |
| **GitHub Pages** | zdarma | nahrajete do repozitáře, zapnete Pages |
| **Český hosting** (Wedos, Forpsi, ...) | ~50 Kč/měs | nahrajete přes FTP do `www/` |

Vlastní doménu (`mostavty.cz`) si zaregistrujete zvlášť a nasměrujete
na hosting — každá z těch služeb má k tomu návod.

Po nasazení ještě:

1. zkontrolujte, že web běží na **https** (u všech výše je certifikát zdarma),
2. přidejte web do [Google Search Console](https://search.google.com/search-console)
   a vložte tam `sitemap.xml`,
3. vytvořte si profil na **Google Business** — pro lokální firmu přináší
   víc poptávek než samotný web,
4. otestujte formulář tím, že si pošlete zkušební zprávu.

## Jazykové mutace

Web je ve třech jazycích:

| Jazyk | Adresa | Složka |
|---|---|---|
| Čeština (výchozí) | `/` | kořen projektu |
| Angličtina | `/en/` | [en/](en/) |
| Němčina | `/de/` | [de/](de/) |

Přepínač **CZ / EN / DE** je v hlavičce každé stránky. Aktivní jazyk je
zvýrazněný oranžově.

### Jak je to poskládané

- **URL jsou přeložené** — `/sluzby.html`, `/en/services.html`,
  `/de/leistungen.html`. Je to lepší pro SEO než `?lang=en`.
- **Jeden CSS a jeden JS** pro všechny jazyky. Hlášky formuláře se
  přepínají podle `<html lang="…">` — slovník je na začátku
  [js/main.js](js/main.js) v proměnné `STRINGS`.
- **`hreflang`** odkazy v hlavičce i v `sitemap.xml` říkají Googlu, že jde
  o tutéž stránku v jiném jazyce.
- **Obrázky jsou společné** — složka `img/` se nekopíruje, mutace na ni
  odkazují přes `../img/`.

### Když budete něco měnit

Úprava textu na jedné jazykové verzi **se nepromítne do ostatních** — je to
statický web, každý soubor je samostatný. Při změně ceny, telefonu nebo
údaje o firmě je potřeba projít všechny tři verze.

Nejrychleji to zkontrolujete takto:

```bash
grep -rn "12 000 Kč\|12,000 CZK\|12 000 CZK" --include="*.html" .
```

### Ceny v cizojazyčných verzích

U cen je kromě korun uvedený orientační přepočet na eura
(např. „from 12,000 CZK/m² (approx. 480 EUR)"). **Kurz se mění**, takže to
časem přestane sedět — buď přepočet občas aktualizujte, nebo ho vymažte
a nechte jen koruny.

## Struktura projektu

```
mostavty/
├── index.html                      úvodní stránka
├── sluzby.html                     přehled služeb
├── reference.html                  galerie realizací s filtrem
├── o-nas.html                      o firmě, tým, doklady
├── kontakt.html                    kontakty + poptávkový formulář
├── ochrana-osobnich-udaju.html     GDPR (šablona)
├── inzeraty-interni.html           INTERNÍ — podklady pro inzerci
├── 404.html                        chybová stránka
├── robots.txt
├── sitemap.xml
├── en/                             anglická mutace
│   ├── index.html                  · services.html, projects.html,
│   ├── about.html                  ·   contact.html, privacy.html, 404.html
│   └── services/                   · 5 podstránek služeb
├── de/                             německá mutace
│   ├── index.html                  · leistungen.html, referenzen.html,
│   ├── ueber-uns.html              ·   kontakt.html, datenschutz.html, 404.html
│   └── leistungen/                 · 5 podstránek služeb
├── css/
│   └── style.css                   veškerý styl, barvy v :root na začátku
├── js/
│   └── main.js                     navigace, formulář, galerie, FAQ
├── img/
│   ├── reference/                  fotky zakázek
│   └── sluzby/                     fotky služeb
└── sluzby/
    ├── rekonstrukce-bytu.html
    ├── rekonstrukce-domu.html
    ├── sadrokarton.html
    ├── stuky-omitky.html
    └── podlahy.html
```

## Jak si web upravit

### Změna barev

Všechny barvy jsou na začátku [css/style.css](css/style.css) v bloku
`:root`. Změnou jedné hodnoty se přebarví celý web:

```css
--c-accent: #f07d1a;   /* oranžová — tlačítka, akcenty */
--c-dark:   #1c1f24;   /* antracit — hlavička, patička */
```

### Přidání nové stránky služby

Zkopírujte kterýkoli soubor ze složky `sluzby/`, přepište obsah a přidejte
odkaz do navigace v patičce všech stránek a do `sitemap.xml`.

### Co dělá JavaScript

Soubor [js/main.js](js/main.js) je rozdělený na číslované moduly, každý
s komentářem. Pokud nějakou funkci nepotřebujete, můžete její řádek
zakomentovat v bloku na konci souboru — zbytek bude fungovat dál.

Web funguje i **bez JavaScriptu**: obsah je celý v HTML. Nefunguje jen
mobilní menu, filtr galerie, lightbox a odesílání formuláře.

## Co by webu dál pomohlo

Tohle není potřeba hned, ale přinese to nejvíc poptávek:

1. **Skutečné fotky** vlastních realizací, hlavně „před a po".
2. **Google Business profil** s fotkami a hodnoceními.
3. **Konkrétní případové studie** — co byla zakázka, co jste udělali,
   za jak dlouho a za kolik. Lidé čtou právě tohle.
4. **Skutečné reference** od zákazníků se jménem a městem.
