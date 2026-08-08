# ZeroBudget

**Simple zero-based budgeting.** Give every dollar a job.

A clean, private Progressive Web App you can install on your iPhone home screen or use on any desktop. Perfect for sharing with family via a simple GitHub Pages link.

## Features (v1)

### Must-have
- Zero-based monthly budget (Income − Planned = $0)
- Custom categories and unlimited line items
- Planned / Spent / Remaining tracking with progress bars
- Manual transaction entry
- Sinking funds (savings goals that carry over)
- Month navigation + copy previous month
- Fully offline-capable after first load
- Data stays on your device (localStorage)

### Import tools
- **Capital One CSV import** — download transactions from capitalone.com (desktop) and import them
- **Category Totals import** — quickly enter the numbers from Capital One’s Spend Analyzer (or any category summary) to set realistic planned amounts

### Nice-to-have already included
- Export transactions as CSV
- Reset month
- Installable as a real app on iOS and Android

## How to use (for your kids / family)

1. Open the link on an iPhone
2. Tap the Share button → **Add to Home Screen**
3. The app now appears like a native app with its own icon
4. Start by setting your monthly income, then assign every dollar to categories until “Left to Budget” shows $0

## Deploy to GitHub Pages

1. Create a new repository (e.g. `zerobudget`)
2. Upload all files in this folder to the root of the repo
3. Go to **Settings → Pages**
4. Set Source to **Deploy from a branch** → `main` / `/ (root)`
5. Your app will be live at `https://YOURUSERNAME.github.io/zerobudget/`

## Capital One Import Tips

- Log in at **capitalone.com** on a **desktop browser** (export is not available in the mobile app)
- Open the credit card or bank account → Activity / Transactions
- Click **Download Transactions** → choose CSV → select date range (max ~90 days)
- In ZeroBudget go to **More → Import Capital One CSV**

For the Spend Analyzer pie chart numbers:
- Go to **More → Import Category Totals**
- Type or paste the category names + dollar amounts you see

## Privacy

Everything is stored only in your browser’s local storage.  
No accounts, no servers, no tracking.

## License

MIT — free to use and modify for personal or family use.

---

Built with care for simple, effective zero-based budgeting.