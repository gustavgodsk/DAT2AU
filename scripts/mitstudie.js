{
    const subjects = [];
    let current_date = null;

    function colorButton(button, color) {
        button.style.background = color;
    }

    function addEvent(event) {        
        //Add colors to event including (Forlæsning, mv.)
        const button = event.querySelector("button");
        if (button == null) return;
        const eventTitle = button.querySelector("h4").textContent;
        let subject;
        const existingSubject = subjects.find(
            (node) => node.eventTitle === eventTitle
        );
        if (existingSubject) {
            subject = existingSubject;
        } else {
            const color = getNewColor();
            subject = {
                button,
                eventTitle,
                color
            };
            subjects.push(subject);
        }

        //farvelæg ::before
        const eventType = button
            .querySelector("dl")
            .querySelector(
                ".event__details__item--form-and-group"
            )?.textContent;
        button.classList.add(eventType);

        //forkortelser
        if (
            CONFIG.mitstudie.forkortelser.enabled &&
            CONFIG.mitstudie.forkortelser.par[eventTitle]
        ) {
            const h4 = button.querySelector("h4");
            h4.textContent = CONFIG.mitstudie.forkortelser.par[eventTitle];
        }
        //egne forkortelser
        if(
            CONFIG.mitstudie.forkortelser.enabled &&
            CONFIG.mitstudie.forkortelser.ownAbbreviations[eventTitle]
        ) {
            const h4 = button.querySelector("h4");
            h4.textContent = CONFIG.mitstudie.forkortelser.ownAbbreviations[eventTitle];
        }

        colorButton(button, subject.color);
    }

    function getNewColor() {
        for (const [_, color] of Object.entries(
            CONFIG.mitstudie.colors.events
        )) {
            // Tjek om farve allerede er brugt
            const isUsed = subjects.some((subject) => subject.color === color);
            if (!isUsed) {
                return color;
            }
        }
        return getRandomColor(); // Fallback: tilfældig farve hvis alle farver er brugt
    }

    function getRandomColor() {
        const letters = "0123456789ABDCEF";
        let color = "#";
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * letters.length)];
        }
        return color;
    }

    const hide_events = (hide, element = document) => {
        for (const elem of element.querySelectorAll("button")) {
            const classes = [...elem.classList];
            if (
                classes.some(
                    (cssClass) =>
                        cssClass == "Praktisk" || cssClass == "Vejledning"
                )
            ) {
                elem.parentElement.style.display = hide ? "none" : "";
            }
        }
    };
    const is_hidden = () => CONFIG.mitstudie.hide_vejledning ?? false;

    const add_toggle_input = () => {
        if (document.getElementById("hide_vejledning")) return;

        // tilføj fjern events knap
        const toolbar = document.querySelector(".toolbar__items");
        if (!toolbar) return;

        hide_events_parent = document.createElement("div");
        hide_events_parent.classList.add("button", "button--text");

        checkbox = document.createElement("input");
        checkbox.setAttribute("type", "checkbox");
        checkbox.setAttribute("id", "hide_vejledning");
        checkbox.setAttribute("name", "hide_vejledning");
        checkbox.checked = is_hidden();

        checkbox.addEventListener("change", async (el) => {
            const newValue = el.target.checked;

            hide_events(newValue);
            saveDeepSetting("mitstudie.hide_vejledning", newValue);
        });

        label = document.createElement("label");
        label.style.userSelect = "none";
        label.style.marginLeft = "2px";
        label.setAttribute("for", "hide_vejledning");
        label.textContent = "Skjul vejledning";

        hide_events_parent.appendChild(checkbox);
        hide_events_parent.appendChild(label);
        toolbar.insertBefore(hide_events_parent, toolbar.lastElementChild);
    };

    function callback(mutationList) {
        for (const mutation of mutationList) {
            if (mutation.type !== "childList") return;
            // Ved fetch af data for ny uge
            if (
                mutation.target.classList.contains(
                    "timetable__singleday-events"
                ) &&
                mutation.addedNodes.length > 0
            ) {
                const event = mutation.addedNodes[0];
                addEvent(event);
                hide_events(is_hidden(), event);
            }
            // Hvis data for ugen allerede er fetched
            else if (
                mutation.target.className === "timetable__week" &&
                mutation.addedNodes.length > 0 &&
                mutation.addedNodes[0].classList.contains(
                    "timetable__singleday-events"
                )
            ) {
                const dayEvents =
                    mutation.addedNodes[0].querySelectorAll(".event");
                const hide =
                    document.getElementById("hide_vejledning")?.checked ||
                    false;
                dayEvents.forEach((element) => {
                    addEvent(element);
                    hide_events(hide, element);
                });
            }
            // Ved page load (hele timetable bliver lavet på én gang)
            else if (
                mutation.addedNodes.length > 0 &&
                mutation.addedNodes[0].childNodes.values((node) =>
                    node.classList.contains("timetable")
                )
            ) {
                const children = [
                    ...mutation.addedNodes[0].childNodes.values()
                ];
                const timetable = children?.filter((node) =>
                    node.classList?.contains("timetable")
                )[0];
                const dayEvents = timetable?.querySelectorAll(".event");
                const hide = is_hidden();
                if (dayEvents != null) {
                    dayEvents.forEach((event) => {
                        addEvent(event);
                        hide_events(hide, event);
                    });
                }

                colorToday();
            }

            if (
                mutation.addedNodes.length > 0 &&
                mutation.addedNodes[0].childNodes.values((node) =>
                    node.classList.contains("toolbar")
                )
            ) {
                add_toggle_input();
            }
            if (mutation.addedNodes.item(0)?.classList?.contains("event")) {
                const hide =
                    document.getElementById("hide_vejledning")?.checked ||
                    false;
                hide_events(hide, mutation.addedNodes[0]);
            }
        }
    }

    /* Method to change the background color of todays date and call updateLine*/
    function colorToday() {
        // No clue what this does or why it was 
        // here before, so i'll just leave it.
        if (lineElement) {
            lineElement.remove();
            lineElement = null;
        }

        //Conversion to danish
        const daysToDanish = [
            'søndag', 'mandag', 'tirsdag', 'onsdag',
            'torsdag', 'fredag', 'lørdag'
        ];

        const monthsToDanish = [
            'januar', 'februar', 'marts', 'april',
            'maj', 'juni', 'juli', 'august',
            'september', 'oktober', 'november', 'december'
        ];

        // Create the ariaLabel which matches the header of today
        const date = new Date();
        const dayName = daysToDanish[date.getDay()];
        const dayNumber = date.getDate();
        const monthName = monthsToDanish[date.getMonth()];
        const year = date.getFullYear();
        const ariaLabel = `${dayName}, ${dayNumber}. ${monthName} ${year}`;
        
        //Get div with this ariaLabel
        const headerElement = document.querySelector(`[aria-label*="${ariaLabel}"]`);
        if(!headerElement) return; //Not on page containing today

        //Very next div, which is the element we want
        const todayElement = headerElement.nextElementSibling?.closest('div');
        if(!todayElement) return;

        //Set color and update line
        todayElement.style.backgroundColor = CONFIG.mitstudie.colors.current_day_color;
        updateLine(todayElement);
    }

    let timetableHeight = 0;
    let lineElement = null;

    function updateLine(today) {
        if (!today) return;

        timetableHeight = today.clientHeight;
        if (!lineElement) {
            lineElement = document.createElement("div");
            lineElement.style.setProperty("position", "absolute", "important");
            lineElement.style.height = "5px";
            lineElement.style.width = "100%";
            lineElement.style.zIndex = "9999";
            lineElement.style.backgroundColor =
                CONFIG.mitstudie.colors.line_color;
            lineElement.style.pointerEvents = "none";
            today.style.position = "relative";
            today.appendChild(lineElement);
        }

        const getTopPercentage = calculateTopPercentage();
        lineElement.style.top = getTopPercentage * timetableHeight + "px";
    }

    /*Method to calculate the placement of the currentTime line*/
    function calculateTopPercentage() {
        const now = new Date();
        const current = now.getHours() + now.getMinutes() / 60;

        const timespan = document.querySelector(".timetable__hours");
        const count = timespan?.children.length ?? 0;

        const BEGIN = 8;
        const END = count ? BEGIN + count - 1 : 17;

        if (current <= BEGIN) return 0;
        if (current >= END) return 1;
        return (current - BEGIN) / (END - BEGIN);
    }

    const observer = new MutationObserver(callback);

    function setupCSS() {
        const style = document.createElement("style");

        const colorRules = Object.entries(CONFIG.mitstudie.colors.event_type)
            .map(
                ([name, color]) =>
                    `.${name}::before { background-color: ${color} !important; }`
            )
            .join("\n");

        style.textContent =
            colorRules +
            `
    .timetable .event {
        --transparent: none !important;
        --transparent-hover: none !important;
    }
    .timetable .event__details {
        color: var(--color-foreground);
    }
    `;

        document.head.appendChild(style);
    }

    async function setup() {
        if (!CONFIG.mitstudie.enabled) return;

        const parent = document.querySelector(".app-mitstudie-container");
        observer.observe(parent, {
            childList: true,
            subtree: true
        });

        setupCSS();
    }

    window.addEventListener("configReady", () => {
        setup();
    });

    if (window.CONFIG) {
        setup();
    }
}
