# VetDose Pro 🐾

محاسبه‌گر حرفه‌ای دوز داروهای دامپزشکی بر اساس کتاب مرجع
**Plumb's Veterinary Drug Handbook — 10th Edition**

ساخته و طراحی شده توسط دکتر مهدیار رمزگویان

---

## امکانات

- **۵۲۰ دارو** با اطلاعات کامل (در مقابل چند داروی نسخه قبلی)
- **۱۵ گونه** حیوانی: سگ، گربه، اسب، گاو، خرگوش، پرنده، خزنده، راسو، خوک، گوسفند، بز، پستانداران کوچک و...
- **محاسبه‌گر دوز** بر اساس وزن حیوان → دوز کل و حجم تزریق
- **۵۱۰۰+ دوز عددی** استخراج‌شده با مورد مصرف، روش تجویز و فرکانس
- **متن کامل دوز** هر دارو به تفکیک گونه
- **عوارض جانبی** (Adverse Effects)
- **احتیاط‌ها و موارد منع مصرف** (Contraindications/Precautions/Warnings)
- **رابط دو زبانه** فارسی / انگلیسی با یک کلیک
- جستجوی هوشمند با تکمیل خودکار (autocomplete)
- طراحی ریسپانسیو (موبایل و دسکتاپ)

---

## ساختار فایل‌ها

```
vetdose_pro/
├── app.py                 ← بک‌اند Flask
├── wsgi.py                ← فایل راه‌اندازی PythonAnywhere
├── requirements.txt
├── data/
│   └── drugs.json         ← پایگاه داده ۵۲۰ دارو
├── templates/
│   └── index.html
└── static/
    ├── style.css
    └── app.js
```

---

## نصب روی PythonAnywhere (قدم به قدم)

### ۱. آپلود فایل‌ها
کل پوشه `vetdose_pro` را در مسیر خانگی خود آپلود کنید:
```
/home/mahdiyarvet/vetdose_pro
```
(می‌توانید پوشه را zip کرده، آپلود و سپس در Bash console با `unzip` باز کنید.)

### ۲. نصب Flask
در یک **Bash console**:
```bash
pip install --user flask
```

### ۳. تنظیم Web app
- به تب **Web** بروید → **Add a new web app**
- **Manual configuration** را انتخاب کنید (نه Flask wizard)
- نسخه Python: ۳.۱۰ یا بالاتر

### ۴. ویرایش فایل WSGI
روی لینک فایل WSGI کلیک کنید (مثل `/var/www/mahdiyarvet_pythonanywhere_com_wsgi.py`)
و **تمام محتوای آن را** با این جایگزین کنید:

```python
import sys
project_home = "/home/mahdiyarvet/vetdose_pro"
if project_home not in sys.path:
    sys.path.insert(0, project_home)
from app import app as application
```

> ⚠️ مسیر `mahdiyarvet` را با نام کاربری خودتان جایگزین کنید.

### ۵. تنظیم مسیر فایل‌های static (اختیاری ولی توصیه‌شده)
در تب Web، بخش **Static files**:
| URL | Directory |
|-----|-----------|
| `/static/` | `/home/mahdiyarvet/vetdose_pro/static/` |

### ۶. Reload
دکمه سبز **Reload** را بزنید. تمام! 🎉

سایت شما روی `https://mahdiyarvet.pythonanywhere.com` به‌روزرسانی می‌شود.

---

## اجرای محلی (تست روی کامپیوتر خودتان)

```bash
cd vetdose_pro
pip install -r requirements.txt
python app.py
```
سپس مرورگر را روی `http://localhost:5000` باز کنید.

---

## نکته مهم ایمنی ⚕️

این ابزار یک کمک‌آموزشی است. تمام دوزهای عددی به‌صورت خودکار از متن کتاب استخراج شده‌اند
و **همیشه** متن اصلی هر گونه نیز در تب «متن کامل دوز» قابل مشاهده است.
پیش از تجویز، دوز را با منبع اصلی Plumb's تأیید کنید. مسئولیت نهایی تجویز بر عهده دامپزشک است.

برخی داروها (موضعی، چشمی، گوشی) دوز وزنی ندارند؛ برای آن‌ها متن کامل نمایش داده می‌شود.
