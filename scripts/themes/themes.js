
// Because querySelector doesn't work.
function findElementDeep(selector, root = document) {
    let elem = root.querySelector(selector);
    if (elem) return elem;

    for (const el of root.querySelectorAll('*')) {
        if (el.shadowRoot) {
            elem = findElementDeep(selector, el.shadowRoot);
            if (elem) return elem;
        }
    }
    return null;
}

class Theme {
    constructor(backgroundColor, headerColor, navbarColor) {
        this.backgroundColor = backgroundColor;
        this.headerColor = headerColor;
        this.navbarColor = navbarColor;
    }

    get body() { return document.body; }
    get header() { return findElementDeep('.d2l-navigation-s'); }
    get navBand() { return findElementDeep('d2l-labs-navigation-band'); }
    get navFooter() { return findElementDeep('d2l-labs-navigation-main-footer'); }

    apply() {
        //Only apply this rule to /home
        const isHomePage = window.location.pathname.includes('/d2l/home');
        if (isHomePage) {
            if (this.body && this.backgroundColor) {
                this.body.style.backgroundColor = this.backgroundColor;
            }
        }
        
        if (this.header && this.headerColor) {
            this.header.style.backgroundColor = this.headerColor;
        }
        
        if (this.navFooter && this.navbarColor) {
            this.navFooter.style.backgroundColor = this.navbarColor;
        }

        console.log("Theme applied successfully.");
    }
}

class DateRange {
    constructor(fromDay, fromMonth, toDay, toMonth) {
        this.fromDay = fromDay;
        this.fromMonth = fromMonth;
        this.toDay = toDay;
        this.toMonth = toMonth;
    }

    // Checks if today falls within this range (handles year wrap-arounds too!)
    isCurrentSeason() {
        const now = new Date();
        const currentVal = (now.getMonth() + 1) * 100 + now.getDate();
        const fromVal = this.fromMonth * 100 + this.fromDay;
        const toVal = this.toMonth * 100 + this.toDay;

        if (fromVal <= toVal) {
            // Standard range within the same year (e.g., Oct 1 to Oct 31)
            return currentVal >= fromVal && currentVal <= toVal;
        } else {
            // Cross-year range wrapping into January (e.g., Nov 1 to Jan 15)
            return currentVal >= fromVal || currentVal <= toVal;
        }
    }
}

const seasonalRegistry = [
    {
        name: "halloween",
        range: new DateRange(30, 10, 31, 10), 
        theme: new Theme("#150b24", "#21102b", "#e56700")
    },
    {
        name: "christmas",
        range: new DateRange(1, 12, 31, 12), 
        theme: new Theme("#0b3b2c", "#8b0000", "#0e4d35")
    }
];


function determineActiveTheme() {
    
    for (const entry of seasonalRegistry) {
        if (entry.range.isCurrentSeason()) {
            console.log(`Auto-detected season: ${entry.name}`);
            return entry.theme;
        }
    }
    console.log("Auto-detected season: none");
    return null;
}

{
    function setup() {
        if (!CONFIG?.themes?.enabled) return;

        let attempts = 0;
        const maxAttempts = 30; // Limits to max pools

        // Poll until the primary header element is ready in the DOM
        const interval = setInterval(() => {
            attempts++;
            const headerCheck = findElementDeep('.d2l-navigation-s');

           
            if (headerCheck) {
                clearInterval(interval); // Stop polling successfully

                const theme = determineActiveTheme();
                if(theme){
                    theme.apply();
                }

            } else if (attempts >= maxAttempts) {
                console.warn(`Theme Decorator: Timed out after ${maxAttempts} attempts. Navigation element not found.`);
                clearInterval(interval); // Stop polling to prevent infinite resource drain
            }
        }, 100);
    }

    window.addEventListener("configReady", () => setup());

    if (window.CONFIG) {
        setup();
    } 
}