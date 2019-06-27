const NOTIFY = {ERROR: "error", INFO: "info", SUCCESS: "success", WARNING: "warning", MESSAGE: "message"};
class MyMangaDex {
    constructor() {
        this.pageUrl = window.location.href;
        this.loggedMyAnimeList = true;
        this.csrf = "";
        this.manga = {
            name: "",
            myAnimeListId: 0,
            lastMangaDexChapter: 0,
            mangaDexId: 0,
            chapterId: 0,
            chapters: [],
            currentChapter: {chapter: 0, volume: 0}
        };
        this.fetched = false;
        this.myAnimeListImage = "https://ramune.nikurasu.org/mymangadex/myanimelist.png";
        this.mmdImage = "https://ramune.nikurasu.org/mymangadex/128.png";
        this.mmdCrossedImage = "https://ramune.nikurasu.org/mymangadex/128b.png";
    }

    async start() {
        this.options = await loadOptions();

        // Choose page
        if ((this.pageUrl.indexOf("org/follows") > -1 && this.pageUrl.indexOf("/manga/") == -1) ||
            (this.pageUrl.indexOf("org/group") > -1 && (this.pageUrl.indexOf("/chapters/") > -1 || (this.pageUrl.indexOf("/manga/") == -1 && this.pageUrl.indexOf("/comments/") == -1))) ||
            (this.pageUrl.indexOf("org/user") > -1 && (this.pageUrl.indexOf("/chapters/") > -1 || this.pageUrl.indexOf("/manga/") == -1))) {
            this.chaptersListPage();
        } else if (this.pageUrl.indexOf("org/search") > -1 ||
            this.pageUrl.indexOf("org/?page=search") > -1 ||
            this.pageUrl.indexOf("org/?page=titles") > -1 ||
            this.pageUrl.indexOf("org/featured") > -1 ||
            this.pageUrl.indexOf("org/titles") > -1 ||
            this.pageUrl.indexOf("org/genre") > -1 ||
            this.pageUrl.indexOf("org/list") > -1 ||
            (this.pageUrl.indexOf("org/follows") > -1 && this.pageUrl.indexOf("/manga/") > -1) ||
            (this.pageUrl.indexOf("org/group") > -1 && this.pageUrl.indexOf("/manga/") > -1) ||
            (this.pageUrl.indexOf("org/user") > -1 && this.pageUrl.indexOf("/manga/") > -1)) {
            this.titlesListPage();
        } else if (this.pageUrl.indexOf("org/title") > -1 || this.pageUrl.indexOf("org/manga") > -1) {
            this.titlePage();
        } else if (this.pageUrl.indexOf("org/chapter") > -1) {
            this.singleChapterPage();
        } else if (this.pageUrl.indexOf("org/history") > -1) {
            this.historyPage();
        }
    }

    // START HELP

    async fetchMyAnimeList() {
        let data = await browser.runtime.sendMessage({
            action: "fetch",
            url: "https://myanimelist.net/ownlist/manga/" + this.manga.myAnimeListId + "/edit?hideLayout",
            options: {
                method: "GET",
                cache: "no-cache",
                credentials: "include",
                redirect: "follow",
            }
        });
        this.fetched = true;
        // init and set if it was redirected - redirected often means not in list or not approved
        if (data.url.indexOf("login.php") > -1) {
            if (CHROME) {
                this.notification(NOTIFY.ERROR, "Not logged in", "Login {{here:https://myanimelist.net/login.php}} on MyAnimeList !", this.myAnimeListImage, true);
            } else {
                this.notification(NOTIFY.ERROR, "Not logged in",
                    [
                        "Login {{here:https://myanimelist.net/login.php}} on MyAnimeList !\r\n",
                        "If you see this error while logged in, see {{this issue:https://github.com/Glagan/MyMangaDex/issues/5}} on **Github**.",
                    ].join(""), this.myAnimeListImage, true);
            }
            this.loggedMyAnimeList = false;
        } else {
            // CSRF Token
            this.csrf = /'csrf_token'\scontent='(.{40})'/.exec(data.body)[1];
            processMyAnimeListResponse(this.manga, data.body);
        }
    }

    async updateMyAnimeList(usePepper = true, setStatus = 1) {
        if (this.loggedMyAnimeList) {
            if (this.manga.is_approved) {
                // If the current chapter is higher than the last read one
                // Use Math.floor on the current chapter to avoid updating even tough it's the same if this is a sub chapter
                let realChapter = Math.floor(this.manga.currentChapter.chapter);
                let isHigher = (realChapter > this.manga.lastMyAnimeListChapter);
                if (usePepper && !isHigher && (this.options.saveOnlyHigher || realChapter == this.manga.lastMyAnimeListChapter)) {
                    this.notification(NOTIFY.INFO, "Not updated", "Last read chapter on MyAnimelist is higher or equal to the current chapter and wasn't updated.", "https://mangadex.org/images/manga/" + this.manga.mangaDexId + ".thumb.jpg");
                    return;
                }

                let oldStatus = this.manga.status;
                let {requestURL, body} = buildMyAnimeListBody(usePepper, this.manga, this.csrf, setStatus);

                // Send the POST request to update the manga
                await browser.runtime.sendMessage({
                    action: "fetch",
                    url: requestURL,
                    options: {
                        method: "POST",
                        body: body,
                        redirect: "follow",
                        credentials: "include",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded",
                            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
                        }
                    }
                });

                if (usePepper) {
                    if (this.manga.status == 6) {
                        this.notification(NOTIFY.SUCCESS, "Added to Plan to Read", "**" + this.manga.name + "** has been put in your endless Plan to read list !", "https://mangadex.org/images/manga/" + this.manga.mangaDexId + ".thumb.jpg");
                    } else {
                        if ("started" in this.manga) {
                            delete this.manga.started;
                            this.notification(NOTIFY.SUCCESS, "Manga updated", "You started reading **" + this.manga.name + "**", "https://mangadex.org/images/manga/" + this.manga.mangaDexId + ".thumb.jpg");
                            if ("start_today" in this.manga) {
                                delete this.manga.start_today;
                                this.notification(NOTIFY.SUCCESS, "Started manga", "The start date of **" + this.manga.name + "** was set to today.", "https://mangadex.org/images/manga/" + this.manga.mangaDexId + ".thumb.jpg");
                            }
                        } else if (this.manga.lastMyAnimeListChapter > 0 && (this.manga.status != 2 || (this.manga.status == 2 && this.manga.is_rereading))) {
                            this.notification(NOTIFY.SUCCESS, "Manga updated", "**" + this.manga.name + "** has been updated to chapter " + this.manga.lastMyAnimeListChapter + ((this.manga.total_chapter > 0) ? " out of " + this.manga.total_chapter : ""), "https://mangadex.org/images/manga/" + this.manga.mangaDexId + ".thumb.jpg");
                        }

                        if (this.manga.status == 2 && !this.manga.is_rereading) {
                            this.notification(NOTIFY.SUCCESS, "Manga updated", "**" + this.manga.name + "** was set as completed.", "https://mangadex.org/images/manga/" + this.manga.mangaDexId + ".thumb.jpg");
                            if ("end_today" in this.manga) {
                                delete this.manga.end_today;
                                this.notification(NOTIFY.SUCCESS, "Manga completed", "The finish date of **" + this.manga.name + "** was set to today.", "https://mangadex.org/images/manga/" + this.manga.mangaDexId + ".thumb.jpg");
                            }
                        }
                    }
                }

                if (this.options.updateMDList && (this.manga.status != oldStatus || this.manga.completed !== undefined)) {
                    await this.updateMangaDexList("manga_follow", this.manga.status);
                }
            } else {
                this.notification(NOTIFY.INFO, "Not updated", "The manga is still pending approval on MyAnimelist and can't be updated.", this.myAnimeListImage, true);
            }
        }
    }

    async quickAddOnMyAnimeList(status) {
        // Delete the row content, to avoid clicking on any button again and to prepare for new content
        this.informationsNode.textContent = "Loading...";

        // Put it in the reading list
        if (!this.fetched) {
            await this.fetchMyAnimeList();
        }
        await this.updateMyAnimeList(true, status);
        this.insertMyAnimeListInformations();
    }

    // MAL status:  READING: 1, COMPLETED: 2, ON_HOLD: 3, PLAN_TO_READ: 6, DROPPED: 4, RE_READING: 1+is_rereading
    // MD status:   READING: 1, COMPLETED: 2, ON_HOLD: 3, PLAN_TO_READ: 4, DROPPED: 5, RE_READING: 6
    async updateMangaDexList(func, type) {
        // Convert MAL status to MD
        if (type == 6) type = 4;
        else if (type == 4) type = 5;
        // Send the request
        let time = new Date().getTime();
        try {
            await browser.runtime.sendMessage({
                action: "fetch",
                url: "https://mangadex.org/ajax/actions.ajax.php?function=" + func + "&id=" + this.manga.mangaDexId + "&type=" + type + "&_=" + time,
                options: {
                    method: "GET",
                    redirect: "follow",
                    credentials: "include",
                    headers: {
                        "X-Requested-With": "XMLHttpRequest"
                    }
                }
            });
            this.notification(NOTIFY.SUCCESS, undefined, "Status on MangaDex updated");
        } catch (error) {
            this.notification(NOTIFY.ERROR, undefined, "Error updating MDList");
        }
    }

    getVolumeChapterFromNode(node) {
        let chapter = node.getAttribute("data-chapter");

        // If it's a Oneshot or just attributes are empty, we use a regex on the title
        if (chapter == "") {
            // If the chapter isn't available in the attributes we get it with a good ol' regex
            return this.getVolumeChapterFromString(node.children[1].textContent);
        }

        return {
            volume: Math.floor(node.getAttribute("data-volume")) || 0,
            chapter: parseFloat(chapter) || 1
        };
    }

    getVolumeChapterFromString(string) {
        // The ultimate regex ? Don't think so... Volume[1] Chapter[2] + [3]
        let regexResult = /(?:Vol(?:\.|ume)\s*)?([0-9]+)?\s*(?:Ch(?:\.|apter)\s*)([0-9]+(?:\.[0-9]+)?)/.exec(string);

        // If it's a Oneshot
        if (regexResult == null) {
            regexResult = [0, 0, 1, undefined];
        }

        return {
            volume: Math.floor(regexResult[1]) || 0,
            chapter: parseFloat(regexResult[2])
        };
    }

    appendTextWithIcon(node, icon, text) {
        let iconNode = document.createElement("span");
        iconNode.className = "fas fa-" + icon + " fa-fw";
        iconNode.setAttribute("aria-hidden", true);

        node.appendChild(iconNode);
        node.appendChild(document.createTextNode(" " + text));
    }

    tooltip(node, id, data=undefined) {
        // Create tooltip
        let tooltip = document.createElement("div");
        tooltip.className = "mmd-tooltip";
        tooltip.style.width = "100px";
        tooltip.style.left = "-1000px";
        this.tooltipContainer.appendChild(tooltip);
        let tooltipThumb = document.createElement("img");
        tooltip.appendChild(tooltipThumb);

        // Append the chapters if there is
        if (this.options.saveAllOpened && data !== undefined && data.chapters !== undefined && data.chapters.length > 0) {
            tooltipThumb.className = "mmd-tooltip-image"; // Add a border below the image

            let chaptersContainer = document.createElement("div");
            chaptersContainer.className = "mmd-tooltip-content";
            let max = Math.min(5, data.chapters.length);
            for (let i = 0; i < max; i++) {
                this.appendTextWithIcon(chaptersContainer, "eye", data.chapters[i]);
                chaptersContainer.appendChild(document.createElement("br"));
            }
            tooltip.appendChild(chaptersContainer);
        }

        tooltipThumb.addEventListener("load", () => {
            // Set it's final position
            let thumbnailDimensions = tooltipThumb.getBoundingClientRect();
            tooltip.style.width = thumbnailDimensions.width + 2 + "px"; // Final width
        });

        // Events
        let inserted = false;
        node.addEventListener("mouseenter", async () => {
            if (!inserted) {
                tooltipThumb.src = await "https://mangadex.org/images/manga/" + id + ".thumb.jpg";
                inserted = true;
            }
            tooltip.classList.add("mmd-active");
            let parentRect = node.getBoundingClientRect();
            let rowRect = tooltip.getBoundingClientRect();
            tooltip.style.left = parentRect.x - rowRect.width - 5 + "px";
            tooltip.style.top = parentRect.y + (parentRect.height / 2) + window.scrollY - (rowRect.height / 2) + "px";
        });
        // Hide the tooltip
        node.addEventListener("mouseleave", () => {
            tooltip.classList.remove("mmd-active");
            tooltip.style.left = "-1000px";
        });

        // Set it last for the load even to work
    }

    highlightChapters() {
        // Chapters list displayed
        let chaptersList = document.querySelector(".chapter-container").children;

        // Get the name of each "chapters" in the list - ignore first line
        for (let i = 1; i < chaptersList.length; i++) {
            let element = chaptersList[i];
            let chapterVolume = this.getVolumeChapterFromNode(element.firstElementChild.firstElementChild);

            if (this.manga.lastMyAnimeListChapter == Math.floor(chapterVolume.chapter)) {
                element.style.backgroundColor = this.options.lastReadColor;
            } else if (this.manga.lastMangaDexChapter == chapterVolume.chapter) {
                element.style.backgroundColor = this.options.lastOpenColors[0];
            // If save all opened is on we highlight them
            } else if (this.options.saveAllOpened) {
                let found = this.manga.chapters.find(value => {
                    return value == chapterVolume.chapter;
                });
                if (found !== undefined) {
                    element.style.backgroundColor = this.options.openedChaptersColor;
                }
            }
        }
    }

    addModalLabel(parent, labelName) {
        let row = document.createElement("div");
        row.className = "row form-group";
        let label = document.createElement("label");
        label.className = "col-sm-3 col-form-label";
        label.textContent = labelName;
        row.appendChild(label);
        let col = document.createElement("div");
        col.className = "col px-0 my-auto";
        row.appendChild(col);
        parent.appendChild(row);
        return col;
    }

    addModalInput(parent, inputType, optionName, value, data = {}) {
        let input = document.createElement(inputType);
        input.className = "form-control";
        input.value = value;
        input.dataset.mal = optionName;
        parent.appendChild(input);
        if (inputType == "input") {
            input.type = data.type;
            if (data.type == "number") {
                input.min = data.min;
                input.max = data.max;
                input.dataset.number = true;
            }
            if (data.type != "checkbox") {
                input.placeholder = data.placeholder;
            } else {
                // Empty and style label
                parent.className = "custom-control custom-checkbox form-check";
                // Input style
                input.id = optionName;
                input.className = "custom-control-input";
                input.checked = value;
                // New label on the right
                let label = document.createElement("label");
                label.className = "custom-control-label";
                label.textContent = data.label;
                label.setAttribute("for", optionName);
                parent.appendChild(label);
            }
        } else if (inputType == "select") {
            if ("number" in data) {
                input.dataset.number = true;
            }
            data.elements.forEach(element => {
                let option = document.createElement("option");
                if ("value" in element) {
                    option.value = element.value;
                } else {
                    option.value = element.text;
                }
                option.textContent = element.text || element.value;
                if (value == option.value) {
                    option.selected = true;
                }
                input.appendChild(option);
            });
        } else if (inputType == "textarea") {
            input.placeholder = data.placeholder;
        }
    }

    addModalRow(parent, labelName, inputType, optionName, value, data={}) {
        let col = this.addModalLabel(parent, labelName);
        if (!("placeholder" in data)) {
            data.placeholder = labelName;
        }
        this.addModalInput(col, inputType, optionName, value, data);
        return col;
    }

    modalControl(open) {
        if (CHROME) {
            document.documentElement.setAttribute("onreset", "$('#modal-mal').modal(" + ((open) ? "" : "hide") + ");");
            document.documentElement.dispatchEvent(new CustomEvent("reset"));
            document.documentElement.removeAttribute("onreset");
        } else {
            // Same as for opening, unwrap and wrap jQuery
            if (open) {
                window.wrappedJSObject.jQuery("#modal-mal").modal();
            } else {
                window.wrappedJSObject.jQuery("#modal-mal").modal("hide");
            }
            XPCNativeWrapper(window.wrappedJSObject.jQuery);
        }
    }

    createMyAnimeListModal() {
        // Container
        let modal = document.createElement("div");
        modal.id = "modal-mal";
        modal.className = "modal show-advanced";
        modal.tabIndex = -1;
        modal.role = "dialog";
        let modalDialog = document.createElement("div");
        modalDialog.className = "modal-dialog modal-lg";
        modalDialog.role = "document";
        modal.appendChild(modalDialog);
        let modalContent = document.createElement("div");
        modalContent.className = "modal-content";
        modalDialog.appendChild(modalContent);

        // Header
        let modalHeader = document.createElement("div");
        modalHeader.className = "modal-header";
        modalContent.appendChild(modalHeader);
        let modalTitle = document.createElement("h4");
        modalTitle.className = "modal-title";
        modalTitle.textContent = "MyAnimeList Informations";
        modalHeader.appendChild(modalTitle);
        let closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.className = "close";
        closeButton.dataset.dismiss = "modal";
        closeButton.textContent = "×";
        modalHeader.appendChild(closeButton);

        // Body
        let modalBody = document.createElement("div");
        modalBody.className = "modal-body";
        modalContent.appendChild(modalBody);
        let bodyContainer = document.createElement("div");
        bodyContainer.className = "container";
        modalBody.appendChild(bodyContainer);

        // Add all informations
        let nameCol = this.addModalLabel(bodyContainer, "Title");
        nameCol.classList.add("mb-0");
        let nameLink = document.createElement("a");
        nameLink.textContent = this.manga.name;
        nameLink.href = "https://myanimelist.net/manga/" + this.manga.myAnimeListId;
        nameCol.appendChild(nameLink);
        let deleteEntry = document.createElement("button");
        deleteEntry.className = "btn btn-danger";
        deleteEntry.textContent = "Delete on MyAnimeList";
        deleteEntry.addEventListener("click", async () => {
            await browser.runtime.sendMessage({
                action: "fetch",
                url: "https://myanimelist.net/ownlist/manga/" + this.manga.myAnimeListId + "/delete",
                options: {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    body: "csrf_token=" + this.csrf
                }
            });
            if (this.informationsNode != undefined) {
                clearDomNode(this.informationsNode);
                // Add a "Add to reading list" button
                let quickAddReading = this.createQuickButton("Start Reading", 1);
                // And a "Plan to read" button
                let quickAddPTR = this.createQuickButton("Add to Plan to Read list", 4);
                // Append
                this.informationsNode.appendChild(quickAddReading);
                this.informationsNode.appendChild(document.createTextNode(" "));
                this.informationsNode.appendChild(quickAddPTR);
            }
            this.notification(NOTIFY.SUCCESS, "Deleted", "The manga has been deleted on **MyAnimeList**.", this.myAnimeListImage);
            this.modalControl(false);
            this.highlightChapters();
        });
        let deleteCol = this.addModalLabel(bodyContainer, "");
        deleteCol.appendChild(deleteEntry);
        this.addModalRow(bodyContainer, "Status", "select", "status", this.manga.status, {number: true, elements: [{value:1,text:"Reading"},{value:2,text:"Completed"},{value:3,text:"On-Hold"},{value:4,text:"Dropped"},{value:6,text:"Plan to Read"}]});
        // START VOLUMES
        let volumesCol = this.addModalRow(bodyContainer, "Volumes Read", "input", "currentChapter.volume", this.manga.last_volume, {type: "number", min: 0, max: 9999});
        volumesCol.classList.add("input-group");
        let volumesOfContainer = document.createElement("div");
        volumesOfContainer.className = "input-group-append";
        let volumesOf = document.createElement("span");
        volumesOf.className = "input-group-text";
        volumesOf.textContent = "of " + this.manga.total_volume;
        volumesOfContainer.appendChild(volumesOf);
        volumesCol.appendChild(volumesOfContainer);
        // END VOLUMES // START CHAPTERS
        let chaptersCol = this.addModalRow(bodyContainer, "Chapters Read", "input", "currentChapter.chapter", this.manga.lastMyAnimeListChapter, {type: "number", min: 0, max: 9999});
        chaptersCol.classList.add("input-group");
        let chaptersOfContainer = document.createElement("div");
        chaptersOfContainer.className = "input-group-append";
        let chaptersOf = document.createElement("span");
        chaptersOf.className = "input-group-text";
        chaptersOf.textContent = "of " + this.manga.total_chapter;
        chaptersOfContainer.appendChild(chaptersOf);
        chaptersCol.appendChild(chaptersOfContainer);
        // END CHAPTERS
        this.addModalRow(bodyContainer, "", "input", "is_rereading", this.manga.is_rereading, {type: "checkbox", label: "Re-reading"});
        this.addModalRow(bodyContainer, "Your score", "select", "score", this.manga.score, {number: true, elements: [{value:"",text:"Select score"},{value:10,text:"(10) Masterpiece"},{value:9,text:"(9) Great"},{value:8,text:"(8) Very Good"},{value:7,text:"(7) Good"},{value:6,text:"(6) Fine"},{value:5,text:"(5) Average"},{value:4,text:"(4) Bad"},{value:3,text:"(3) Very Bad"},{value:2,text:"(2) Horrible"},{value:1,text:"(1) Appalling"}]});
        // DATE START
        let months = [{value:"",text:""},{value:1,text:"Jan"},{value:2,text:"Feb"},{value:3,text:"Mar"},{value:4,text:"Apr"},{value:5,text:"May"},{value:6,text:"June"},{value:7,text:"Jul"},{value:8,text:"Aug"},{value:9,text:"Sep"},{value:10,text:"Oct"},{value:11,text:"Nov"},{value:12,text:"Dec"}];
        let days = [{value:""},{value:1},{value:2},{value:3},{value:4},{value:5},{value:6},{value:7},{value:8},{value:9},{value:10},{value:11},{value:12},{value:13},{value:14},{value:15},{value:16},{value:17},{value:18},{value:19},{value:20},{value:21},{value:22},{value:23},{value:24},{value:25},{value:26},{value:27},{value:28},{value:29},{value:30},{value:31}];
        let years = [{value:""},{value:2019},{value:2018},{value:2017},{value:2016},{value:2015},{value:2014},{value:2013},{value:2012},{value:2011},{value:2010},{value:2009},{value:2008},{value:2007},{value:2006},{value:2005},{value:2004},{value:2003},{value:2002},{value:2001},{value:2000}];
        let dateStart = this.addModalLabel(bodyContainer, "Start date");
        dateStart.className = "col px-0 my-auto form-inline input-group";
        this.addModalInput(dateStart, "select", "start_date.day", this.manga.start_date.day, {number: true, elements: days});
        this.addModalInput(dateStart, "select", "start_date.month", this.manga.start_date.month, {number: true, elements: months});
        this.addModalInput(dateStart, "select", "start_date.year", this.manga.start_date.year, {number: true, elements: years});
        let appendStartToday = document.createElement("span");
        appendStartToday.className = "input-group-append";
        let startToday = document.createElement("button");
        startToday.className = "btn btn-secondary";
        startToday.textContent = "Today";
        startToday.addEventListener("click", () => {
            let today = new Date();
            document.querySelector("[data-mal='start_date.day']").value = today.getDate();
            document.querySelector("[data-mal='start_date.month']").value = today.getMonth()+1;
            document.querySelector("[data-mal='start_date.year']").value = today.getFullYear();
        });
        appendStartToday.appendChild(startToday);
        dateStart.appendChild(appendStartToday);
        let dateEnd = this.addModalLabel(bodyContainer, "Finish date");
        dateEnd.className = "col px-0 my-auto form-inline input-group";
        this.addModalInput(dateEnd, "select", "finish_date.day", this.manga.finish_date.day, {number: true, elements: days});
        this.addModalInput(dateEnd, "select", "finish_date.month", this.manga.finish_date.month, {number: true, elements: months});
        this.addModalInput(dateEnd, "select", "finish_date.year", this.manga.finish_date.year, {number: true, elements: years});
        let appendEndToday = document.createElement("span");
        appendEndToday.className = "input-group-append";
        let endToday = document.createElement("button");
        endToday.className = "btn btn-secondary";
        endToday.textContent = "Today";
        endToday.addEventListener("click", () => {
            let today = new Date();
            document.querySelector("[data-mal='finish_date.day']").value = today.getDate();
            document.querySelector("[data-mal='finish_date.month']").value = today.getMonth()+1;
            document.querySelector("[data-mal='finish_date.year']").value = today.getFullYear();
        });
        appendEndToday.appendChild(endToday);
        dateEnd.appendChild(appendEndToday);
        // DATE END
        this.addModalRow(bodyContainer, "Tags", "textarea", "tags", this.manga.tags);
        this.addModalRow(bodyContainer, "Priority", "select", "priority", this.manga.priority, {number: true, elements: [{value:0,text:"Low"},{value:1,text:"Medium"},{value:2,text:"High"}]});
        this.addModalRow(bodyContainer, "Storage", "select", "storage_type", this.manga.storage_type, {number: true, elements: [{value:"",text:"None"},{value:1,text:"Hard Drive"},{value:6,text:"External HD"},{value:7,text:"NAS"},{value:8,text:"Blu-ray"},{value:2,text:"DVD / CD"},{value:4,text:"Retail Manga"},{value:5,text:"Magazine"}]});
        this.addModalRow(bodyContainer, "How many volumes ?", "input", "retail_volumes", this.manga.retail_volumes, {type: "number", min: 0, max: 999});
        this.addModalRow(bodyContainer, "Total times re-read", "input", "total_reread", this.manga.total_reread, {type: "number", min: 0, max: 999});
        this.addModalRow(bodyContainer, "Re-read value", "select", "reread_value", this.manga.reread_value, {number: true, elements: [{value:"",text:"Select reread value"},{value:1,text:"Very Low"},{value:2,text:"Low"},{value:3,text:"Medium"},{value:4,text:"High"},{value:5,text:"Very High"}]});
        this.addModalRow(bodyContainer, "Comments", "textarea", "comments", this.manga.comments);
        this.addModalRow(bodyContainer, "Ask to discuss?", "select", "ask_to_discuss", this.manga.ask_to_discuss, {number: true, elements: [{value:0,text:"Ask to discuss a chapter after you update the chapter #"},{value:1,text:"Don't ask to discuss"}]});
        this.addModalRow(bodyContainer, "Post to SNS", "select", "sns_post_type", this.manga.sns_post_type, {number: true, elements: [{value:0,text:"Follow default setting"},{value:1,text:"Post with confirmation"},{value:2,text:"Post every time (without confirmation)"},{value:3,text:"Do not post"}]});

        // Footer
        let modalFooter = document.createElement("div");
        modalFooter.className = "modal-footer";
        modalBody.appendChild(modalFooter);
        let modalSave = document.createElement("button");
        modalSave.type = "button";
        modalSave.className = "btn btn-success";
        this.appendTextWithIcon(modalSave, "save", "Save");
        modalSave.addEventListener("click", async () => {
            // Save each values
            let status;
            bodyContainer.querySelectorAll("[data-mal]").forEach(option => {
                let keys = option.dataset.mal.split(".");
                if ("type" in option && option.type == "checkbox") {
                    this.manga[option.dataset.mal] = option.checked;
                } else if (keys.length == 2) {
                    this.manga[keys[0]][keys[1]] = Math.floor(option.value) || option.value;
                } else if (keys == "status") {
                    status = (option.value != "") ? Math.floor(option.value) : option.value;
                } else {
                    this.manga[option.dataset.mal] = ("number" in option.dataset && option.value != "") ? Math.floor(option.value) : option.value;
                }
            });

            await this.updateMyAnimeList(false, status);
            if (this.informationsNode != undefined) {
                this.insertMyAnimeListInformations();
            }
            this.notification(NOTIFY.SUCCESS, "Manga Updated", undefined, this.myAnimeListImage);
            this.modalControl(false);
            this.highlightChapters(); // Highlight last again
        });
        modalFooter.appendChild(modalSave);

        // Append
        document.body.appendChild(modal);
    }

    insertMyAnimeListButton(parentNode = undefined) {
        // Create the modal
        this.createMyAnimeListModal();

        // Insert on the header
        var button = document.createElement("a");
        button.title = "Edit on MyAnimeList";
        button.dataset.toggle = "modal";
        button.dataset.target = "modal-mal";

        // Add icon and text
        if (parentNode === undefined) {
            button.className = "btn btn-secondary float-right mr-1";
            this.appendTextWithIcon(button, "edit", "Edit on MyAnimeList");
        } else {
            button.className = "btn btn-secondary col m-1";
            this.appendTextWithIcon(button, "edit", "");
        }
        // On click we hide or create the modal
        button.addEventListener("click", () => {
            // Update the only values that can change
            document.querySelector("[data-mal='status']").value = this.manga.status;
            document.querySelector("[data-mal='currentChapter.volume']").value = this.manga.last_volume;
            document.querySelector("[data-mal='currentChapter.chapter']").value = this.manga.lastMyAnimeListChapter;
            document.querySelector("[data-mal='is_rereading']").checked = this.manga.is_rereading;
            document.querySelector("[data-mal='start_date.day']").value = this.manga.start_date.day;
            document.querySelector("[data-mal='start_date.month']").value = this.manga.start_date.month;
            document.querySelector("[data-mal='start_date.year']").value = this.manga.start_date.year;
            document.querySelector("[data-mal='finish_date.day']").value = this.manga.finish_date.day;
            document.querySelector("[data-mal='finish_date.month']").value = this.manga.finish_date.month;
            document.querySelector("[data-mal='finish_date.year']").value = this.manga.finish_date.year;
            document.querySelector("[data-mal='total_reread']").value = this.manga.total_reread;

            this.modalControl(true);
        });

        if (parentNode !== undefined) {
            parentNode.appendChild(button);
        } else {
            this.informationsNode.appendChild(button);
        }
    }

    insertMyAnimeListInformations() {
        // Delete node before adding anything to it, it's surely old data anyway
        clearDomNode(this.informationsNode);
        this.insertMyAnimeListButton();

        // Informations
        if (this.manga.status == 2 && !this.manga.is_rereading) {
            let rereadButton = document.createElement("a");
            rereadButton.title = "Re-read";
            // Add icon and text
            rereadButton.className = "btn btn-secondary float-right mr-1";
            this.appendTextWithIcon(rereadButton, "book-open", "Re-read");
            // On click we hide or create the modal
            rereadButton.addEventListener("click", async () => {
                this.manga.currentChapter.chapter = 0;
                this.manga.lastMyAnimeListChapter = 0;
                this.manga.currentChapter.volume = 0;
                this.manga.last_volume = 0;
                this.manga.is_rereading = 1;

                await this.updateMyAnimeList(false);
                this.insertMyAnimeListInformations();
                this.notification(NOTIFY.SUCCESS, "Re-reading", "You started re-reading **" + this.manga.name + "**", "https://mangadex.org/images/manga/" + this.manga.mangaDexId + ".thumb.jpg");

                if (this.options.updateMDList) {
                    await this.updateMangaDexList("manga_follow", 6);
                }
            });

            this.informationsNode.appendChild(rereadButton);
        }

        // Status
        let statusList = [{color:"blueviolet", text:"Not on the list"},{color:"cornflowerblue", text:"Reading"},{color:"darkseagreen", text:"Completed"},{color:"orange", text:"On-Hold"},{color:"firebrick", text:"Dropped"}, null, /* 5 doesn't exist */ {color:"violet", text:"Plan to Read"}];
        let status = document.createElement("span");
        status.style.color = statusList[this.manga.status].color;
        status.textContent = statusList[this.manga.status].text;
        this.informationsNode.appendChild(status);
        // Other "useful" informations
        this.informationsNode.appendChild(document.createElement("br"));
        this.appendTextWithIcon(this.informationsNode, "book", "Volume " + this.manga.last_volume + ((Math.floor(this.manga.total_volume) > 0) ? " out of " + this.manga.total_volume : ""));
        this.informationsNode.appendChild(document.createElement("br"));
        this.appendTextWithIcon(this.informationsNode, "bookmark", "Chapter " + this.manga.lastMyAnimeListChapter + ((Math.floor(this.manga.total_chapter) > 0) ? " out of " + this.manga.total_chapter : "") + ((this.manga.is_rereading) ? " - Re-reading" : ""));
        this.informationsNode.appendChild(document.createElement("br"));
        if (this.manga.start_date.year != "") {
            this.appendTextWithIcon(this.informationsNode, "calendar-alt", "Start date " + this.manga.start_date.year + "/" + this.manga.start_date.month + "/" + this.manga.start_date.day);
            this.informationsNode.appendChild(document.createElement("br"));
        }
        if (this.manga.status == 2 && this.manga.finish_date.year != "") {
            this.appendTextWithIcon(this.informationsNode, "calendar-alt", "Finish date " + this.manga.finish_date.year + "/" + this.manga.finish_date.month + "/" + this.manga.finish_date.day);
            this.informationsNode.appendChild(document.createElement("br"));
        }
        let scoreText;
        if (this.manga.score == "") {
            scoreText = "Not scored yet";
        } else {
            scoreText = "Scored " + this.manga.score + " out of 10";
        }
        this.appendTextWithIcon(this.informationsNode, "star", scoreText);
    }

    async searchMyAnimeListID() {
        let data = await storageGet(this.manga.mangaDexId);
        // If there is no entry for mal link
        if (data === undefined) {
            this.notification(NOTIFY.INFO, "No MyAnimeList ID in storage", "Searching on the manga page of **" + this.manga.name + "** to find a MyAnimeList id.", this.mmdImage);

            // Fetch it from mangadex manga page
            let data = await browser.runtime.sendMessage({
                action: "fetch",
                url: "https://mangadex.org/title/" + this.manga.mangaDexId,
                options: {
                    method: "GET",
                    cache: "no-cache"
                }
            });
            // Scan the manga page for the mal icon and mal url
            let myAnimeListURL = /<a.+href='(.+)'>MyAnimeList<\/a>/.exec(data.body);
            // If regex is empty, there is no mal link, can't do anything
            if (myAnimeListURL === null) {
                this.notification(NOTIFY.ERROR, "No MyAnimeList id found", "You will need to go on the manga page if one is added.\nLast open chapters are still saved.", this.mmdCrossedImage, true);
            } else {
                // If there is a mal link, add it and save it in local storage
                this.manga.myAnimeListId = Math.floor(/.+\/(\d+)/.exec(myAnimeListURL[1])[1]);
            }
        } else {
            // Get the mal id from the local storage
            this.manga.myAnimeListId = data.mal;
            this.manga.lastMangaDexChapter = data.last;
            this.manga.chapters = data.chapters || [];
        }

        // When we know everything
        this.myAnimeListChecked = true;
    }

    insertChapter(chapter) {
        if (this.manga.chapters.indexOf(chapter) === -1) {
            if (this.manga.chapters.length == 0) {
                this.manga.chapters.push(chapter);
            } else {
                let i = 0;
                let max = this.manga.chapters.length;
                let higher = true;
                // Chapters are ordered
                while (i < max && higher) {
                    if (this.manga.chapters[i] < chapter) {
                        higher = false;
                    } else {
                        i++;
                    }
                }
                this.manga.chapters.splice(i, 0, chapter);

                // Check the length
                while (this.manga.chapters.length > this.options.maxChapterSaved) {
                    this.manga.chapters.pop();
                }
            }
        }
    }

    notification(type, title, text=undefined, image=undefined, sticky=false) {
        if (this.options.showNotifications || (type == NOTIFY.ERROR && this.options.showErrors)) {
            let data = {
                position: "bottom-left",
                image: image,
                sticky: sticky
            };
            SimpleNotification[type](title, text, data);
        }
    }

    paintOrHide(manga, mangaDexId, chapters, colors) {
        let data = undefined;
        let paintColor = this.options.lastOpenColors[colors.current];
        let rowsDeleted = 0;

        if (manga !== undefined) {
            data = {chapters: manga.chapters};

            let sawLastChapter = false;
            let sawHigher = false;

            // It's a multiple row list - we delete the old ones if needed
            let lastRow = chapters.length-1;
            for (let chapter in chapters) {
                let currentChapter = chapters[chapter].currentChapter.chapter;
                let currentRow = chapters[chapter].row;

                if (chapter == lastRow && this.options.showNoMal && manga.mal == 0) {
                    let flag = currentRow.querySelector(".chapter-list-flag.col-auto.text-center.order-lg-4");
                    let noMal = flag.firstElementChild.cloneNode();
                    noMal.src = "https://i.imgur.com/n5mQIuH.png";
                    noMal.classList.remove("flag");
                    noMal.alt = "No MyAnimeList ID.";
                    noMal.title = noMal.alt;
                    flag.appendChild(noMal);
                }

                // We delete the row if it's lower and one first - or first but all are lower
                if (currentChapter > manga.last && this.options.highlightChapters) {
                    if (sawLastChapter) {
                        currentRow.firstElementChild.style.backgroundColor = paintColor;
                    }
                    sawHigher = true;
                    currentRow.lastElementChild.firstElementChild.addEventListener("auxclick", () => {
                        currentRow.style.backgroundColor = paintColor;
                    });
                } else if (currentChapter < manga.last) {
                    if (sawLastChapter && this.options.highlightChapters) {
                        currentRow.firstElementChild.style.backgroundColor = paintColor;
                    } else if (!sawHigher || lastRow == 0 || (sawHigher && chapter < lastRow)) {
                        if (this.options.hideLowerChapters) {
                            // Add 2 classes - one to hide the row and the other to find it back
                            currentRow.classList.add("d-none");
                            currentRow.classList.add("mmd-hidden");
                            rowsDeleted++;
                        }
                        if (this.options.highlightChapters) {
                            currentRow.style.backgroundColor = this.options.lowerChaptersColor;
                        }
                    }
                } else if (currentChapter == manga.last) {
                    sawLastChapter = true;
                    if (this.options.highlightChapters) {
                        currentRow.style.backgroundColor = paintColor;
                    }
                }
            }
        } else if (this.options.highlightChapters) {
            chapters.forEach(chapter => {
                chapter.row.lastElementChild.firstElementChild.addEventListener("auxclick", () => {
                    chapter.row.style.backgroundColor = paintColor;
                });
            });
        }
        colors.current = (colors.current + 1) % colors.max;

        // Show a tooltip with the thumbnail if the row wasn't deleted
        if (this.options.showTooltips && chapters.length > 0) {
            this.tooltip(chapters[chapters.length-1].row, mangaDexId, data);
        }

        return rowsDeleted;
    }

    createQuickButton(content, status) {
        let quickButton = document.createElement("button");
        quickButton.className = "btn btn-default";
        quickButton.textContent = content;
        quickButton.addEventListener("click", async () => {
            await this.quickAddOnMyAnimeList(status);
        });
        return quickButton;
    }

    async saveCurrentInHistory() {
        this.history = await this.history;
        if (this.history == undefined || this.history == null || isEmpty(this.history)) {
            this.history = { list: [] };
        }
        if (this.history[this.manga.mangaDexId] == undefined) {
            this.history[this.manga.mangaDexId] = {
                name: this.manga.name,
                id: this.manga.mangaDexId,
                progress: this.manga.currentChapter,
                chapter: this.manga.chapterId,
            };
        } else {
            let index = this.history.list.indexOf(this.manga.mangaDexId);
            if (index >= 0) {
                this.history.list.splice(index, 1);
            }
        }
        this.history.list.push(this.manga.mangaDexId);
        if (this.history.list.length > this.options.historySize) {
            let diff = this.history.list.length-this.options.historySize;
            for (let i = 0; i < diff; i++) {
                delete this.history[this.history.list[i]];
            }
            this.history.list.splice(0, diff);
        }
        await storageSet("history", this.history);
    }

    chapterStringFromObject(chapter) {
        let string = [];
        if (chapter.volume > 0) {
            string.push("Vol. ", chapter.volume, " ");
        }
        string.push("Chapter ", chapter.chapter);
        return string.join("");
    }

    buildHistoryEntryNode(historyEntry) {
        // Build
        let frag = document.createDocumentFragment();
        let container = document.createElement("div");
        container.className = "large_logo rounded position-relative mx-1 my-2";
        let hover = document.createElement("div");
        hover.className = "hover";
        let titleLinkImage = document.createElement("a");
        titleLinkImage.rel = "noreferrer noopener";
        titleLinkImage.href = ["/manga/", historyEntry.id].join("");
        let titleImage = document.createElement("img");
        titleImage.className = "rounded";
        titleImage.title = historyEntry.name;
        titleImage.src = ["/images/manga/", historyEntry.id, ".large.jpg"].join("");
        titleImage.style.width = "100%";
        let informationsContainer = document.createElement("div");
        informationsContainer.className = "car-caption px-2 py-1";
        let titleName = document.createElement("p");
        titleName.className = "text-truncate m-0";
        let titleLinkName = document.createElement("a");
        titleLinkName.className = "manga_title white";
        titleLinkName.title = historyEntry.name;
        titleLinkName.rel = "noreferrer noopener";
        titleLinkName.href = ["/manga/", historyEntry.id].join("");
        titleLinkName.textContent = historyEntry.name;
        let chapterInfo = document.createElement("p");
        chapterInfo.className = "text-truncate m-0";
        let chapterLink = document.createElement("a");
        chapterLink.className = "white";
        chapterLink.rel = "noreferrer noopener";
        chapterLink.href = ["/chapter/", historyEntry.chapter].join("");
        chapterLink.textContent = this.chapterStringFromObject(historyEntry.progress);
        // Append
        titleName.appendChild(titleLinkName);
        chapterInfo.appendChild(chapterLink);
        informationsContainer.appendChild(titleName);
        informationsContainer.appendChild(chapterInfo);
        titleLinkImage.appendChild(titleImage);
        hover.appendChild(titleLinkImage);
        container.appendChild(hover);
        container.appendChild(informationsContainer);
        frag.appendChild(container);
        return frag;
    }

    // END HELP / START PAGE

    async chaptersListPage() {
        if (!this.options.highlightChapters && !this.options.hideLowerChapters && !this.options.showTooltips) {
            return;
        } // Abort early if useless - no highlight, no hiding and no thumbnails

        let chaptersList = document.querySelector(".chapter-container").children;
        // Keep track of the current entries in the follow table
        var chapters = [];
        var colors = {
            current: 0,
            max: this.options.lastOpenColors.length
        };
        // Save each data storage promises to avoid fetching the same data twice - huge speed boost when there is the same serie multiple times
        var localStorage = {};

        // Create a tooltip holder
        if (this.options.showTooltips) {
            this.tooltipContainer = document.createElement("div");
            this.tooltipContainer.id = "mmd-tooltip";
            document.body.appendChild(this.tooltipContainer);
        }

        // Check each rows of the main table - Stop at 1 because first row is the header
        let lastChapter = chaptersList.length-1;
        var hiddenRows = 0;
        let promises = [];
        for (let row = lastChapter; row > 0; --row) {
            let chapter = chaptersList[row];

            // Add the row
            chapters.push({
                row: row,
                currentChapter: this.getVolumeChapterFromNode(chapter.lastElementChild.firstElementChild)
            });

            // If it's a row with a name
            if (chapter.firstElementChild.childElementCount > 0) {
                let mangaDexId = Math.floor(/\/title\/(\d+)\//.exec(chapter.firstElementChild.firstElementChild.href)[1]);
                let chaptersCopy = JSON.parse(JSON.stringify(chapters));
                chaptersCopy.forEach(element => {
                    element.row = chaptersList[element.row];
                }); // Copy DOM nodes

                // Check if the data for the current serie is already fetched
                if (localStorage[mangaDexId] === undefined) {
                    // add the storage call to a promise array for the "show hidden chapters" button
                    promises.push(
                        storageGet(mangaDexId).then(result => {
                            localStorage[mangaDexId] = result;
                            hiddenRows += this.paintOrHide(result, mangaDexId, chaptersCopy, colors);
                        })
                    );
                } else {
                    hiddenRows += this.paintOrHide(localStorage[mangaDexId], mangaDexId, chaptersCopy, colors);
                }
                chapters = [];
            }
        }

        // If chapters are hidden add a button to show them - if there is any hidden
        await Promise.all(promises); // wait for rows that fetch local storage
        if (this.options.hideLowerChapters && hiddenRows > 0) {
            let navBar = document.querySelector(".nav.nav-tabs");
            let showButton = document.createElement("li");
            showButton.className = "nav-item";
            let showLink = document.createElement("a");
            showLink.className = "nav-link";
            showLink.href = "#";
            showLink.addEventListener("click", event => {
                event.preventDefault();
                if (event.target.dataset.show == undefined) {
                    event.target.dataset.show = true;
                    clearDomNode(showLink);
                    this.appendTextWithIcon(showLink, "eye", "Hide Lower (" + hiddenRows + ")");
                    document.querySelectorAll(".mmd-hidden").forEach(node => {
                        node.classList.remove("d-none");
                    });
                } else {
                    delete event.target.dataset.show;
                    clearDomNode(showLink);
                    this.appendTextWithIcon(showLink, "eye", "Show Lower (" + hiddenRows + ")");
                    document.querySelectorAll(".mmd-hidden").forEach(node => {
                        node.classList.add("d-none");
                    });
                }
            });
            this.appendTextWithIcon(showLink, "eye", "Show Lower (" + hiddenRows + ")");
            showButton.appendChild(showLink);
            navBar.appendChild(showButton);
        }
    }

    async titlePage() {
        this.manga.name = document.querySelector("h6.card-header").textContent.trim();
        this.manga.mangaDexId = /.+title\/(\d+)/.exec(this.pageUrl);
        // We always try to find the link, in case it was updated
        let myAnimeListUrl = document.querySelector("img[src$='/mal.png'");
        if (myAnimeListUrl !== null) {
            // Finish getting the mal link
            myAnimeListUrl = myAnimeListUrl.nextElementSibling.href;
            // Get MAL id of the manga from the mal link
            this.manga.myAnimeListId = Math.floor(/.+\/(\d+)/.exec(myAnimeListUrl)[1]);
        } else {
            this.manga.myAnimeListId = 0;
        }

        if (this.manga.mangaDexId === null) {
            let dropdown = document.getElementById("1");
            if (dropdown !== null) {
                this.manga.mangaDexId = Math.floor(dropdown.dataset.mangaId);
            }
        } else {
            this.manga.mangaDexId = Math.floor(this.manga.mangaDexId[1]);
        }

        // Fetch the manga information from the local storage
        let data = await storageGet(this.manga.mangaDexId);
        let firstFetch = false;

        // If there is no entry try to find it
        if (data === undefined) {
            firstFetch = true;
            // Update it at least once to save the mal id
            await updateLocalStorage(this.manga, this.options);
        } else {
            if (data.mal == 0 && this.manga.myAnimeListId > 0) {
                // Still save storage to have the new ID save even if it's not approved
                await updateLocalStorage(this.manga, this.options);
                // set firstFetch to update if valid
                firstFetch = true;
            }
            this.manga.lastMangaDexChapter = data.last;
            this.manga.chapters = data.chapters || [];
            this.manga.currentChapter.chapter = this.manga.lastMangaDexChapter;
        }

        // Informations
        let parentNode = document.querySelector(".col-xl-9.col-lg-8.col-md-7");
        let informationsRow = document.createElement("div");
        informationsRow.className = "row m-0 py-1 px-0 border-top";
        parentNode.insertBefore(informationsRow, parentNode.lastElementChild);
        let informationsLabel = document.createElement("div");
        informationsLabel.className = "col-lg-3 col-xl-2 strong";
        informationsLabel.textContent = "Status:";
        informationsRow.appendChild(informationsLabel);
        this.informationsNode = document.createElement("div");
        this.informationsNode.className = "col-lg-9 col-xl-10";
        informationsRow.appendChild(this.informationsNode);

        // If there is a existing mal link
        if (this.manga.myAnimeListId > 0) {
            // Fetch the edit page of the manga
            await this.fetchMyAnimeList();
            if (this.loggedMyAnimeList) {
                if (this.manga.is_approved) {
                    // Check if the manga is already in the reading list
                    if (this.manga.in_list) {
                        this.insertMyAnimeListInformations();

                        if (firstFetch) {
                            this.manga.currentChapter.chapter = Math.max(this.manga.lastMyAnimeListChapter, this.manga.lastMangaDexChapter);
                            this.insertChapter(this.manga.currentChapter.chapter);
                            await updateLocalStorage(this.manga, this.options);
                        }
                    } else {
                        // Add a "Add to reading list" button
                        let quickAddReading = this.createQuickButton("Start Reading", 1);
                        // And a "Plan to read" button
                        let quickAddPTR = this.createQuickButton("Add to Plan to Read list", 6);
                        // Append
                        this.informationsNode.appendChild(quickAddReading);
                        this.informationsNode.appendChild(document.createTextNode(" "));
                        this.informationsNode.appendChild(quickAddPTR);
                    }
                } else {
                    let pendingMessage = document.createElement("span");
                    pendingMessage.className = "alert-info p-1 rounded";
                    pendingMessage.textContent = "The manga is still pending approval on MyAnimelist and can't be updated.";
                    this.informationsNode.appendChild(pendingMessage);
                }
            } else {
                let notLoggedMesage = document.createElement("span");
                notLoggedMesage.className = "alert-info p-1 rounded";
                notLoggedMesage.textContent = "Login on MyAnimeList to display informations.";
                this.informationsNode.appendChild(notLoggedMesage);
            }
        } else {
            let noIDMessage = document.createElement("span");
            noIDMessage.className = "alert-info p-1 rounded";
            noIDMessage.textContent = "No MyAnimeList found. When one is added, MyMangaDex will find it, don't worry.";
            this.informationsNode.appendChild(noIDMessage);
        }
        this.highlightChapters();
    }

    async singleChapterPage() {
        // We can use the info on the page if we don't change chapter while reading
        let chapter = document.querySelector("meta[property='og:title']").content;
        this.manga.currentChapter = this.getVolumeChapterFromString(chapter);
        this.manga.name = /Volume\s*\d*\s*,\s(.+),.+\sManga/.exec(document.querySelector("meta[name='keywords']").content)[1];

        chapter = document.querySelector("meta[property='og:image']").content;
        this.manga.mangaDexId = Math.floor(/manga\/(\d+)\.thumb.+/.exec(chapter)[1]);
        this.manga.chapterId = Math.floor(document.querySelector("meta[name='app']").dataset.chapterId);

        // Jump chapter
        let legacyReader = !document.getElementById("content").classList.contains("reader");
        let jumpChapter = (legacyReader) ? document.getElementById("jump_chapter") : document.getElementById("jump-chapter");

        // History
        if (this.options.updateHistoryPage) {
            this.history = storageGet("history");
        }

        // Detect which reader we're using - if we're not legacy we have to check when changing chapter
        if (!legacyReader) {
            var observer = new MutationObserver(async mutationsList => {
                for (var mutation of mutationsList) {
                    if (mutation.type == "attributes") {
                        // If the new id is different - check for the first load
                        let newChapterId = Math.floor(document.querySelector(".chapter-title").dataset.chapterId);
                        if (this.manga.chapterId != newChapterId) {
                            this.manga.chapterId = newChapterId;
                            let currentChapter = this.getVolumeChapterFromString(jumpChapter.options[jumpChapter.selectedIndex].textContent);
                            let delayed = (document.getElementsByClassName("alert alert-danger text-center m-auto").length > 0);

                            if (!delayed) {
                                this.manga.currentChapter = currentChapter;

                                // Update the Database and maybe MyAnimeList
                                if (this.myAnimeListChecked && this.manga.myAnimeListId > 0) {
                                    this.updateMyAnimeList();
                                }

                                // We add the current chapter to the list of opened chapters if the option is on
                                if (this.options.saveAllOpened) {
                                    this.insertChapter(this.manga.currentChapter.chapter);
                                }

                                // Update local storage - after, it doesn't really matter
                                await updateLocalStorage(this.manga, this.options);

                                // Update History
                                if (this.options.updateHistoryPage) {
                                    this.saveCurrentInHistory();
                                }
                            } else {
                                this.notification(NOTIFY.ERROR, "Chapter Delayed", "The chapter was not updated and saved since it is delayed on MangaDex.", "https://mangadex.org/images/manga/" + this.manga.mangaDexId + ".thumb.jpg");
                            }
                        }
                    }
                }
            });
            let config = { attributes: true };
            observer.observe(document.querySelector(".chapter-title"), config);
        }

        // Get MAL Url from the database
        let delayed = (document.getElementsByClassName("alert alert-danger text-center m-auto").length > 0);
        await this.searchMyAnimeListID();
        if (!delayed) {
            // We add the current chapter to the list of opened chapters if the option is on
            if (this.options.saveAllOpened) {
                this.insertChapter(this.manga.currentChapter.chapter);
            }

            // Update MyAnimeList
            if (this.manga.myAnimeListId > 0) {
                await this.fetchMyAnimeList();
                if (this.manga.exist && this.manga.is_approved) {
                    await this.updateMyAnimeList();
                    this.insertMyAnimeListButton(document.querySelector(".reader-controls-actions.col-auto.row.no-gutters.p-1").lastElementChild);
                }
            }

            // Update local storage - after, it doesn't really matter
            await updateLocalStorage(this.manga, this.options);

            // Update History
            if (this.options.updateHistoryPage) {
                this.saveCurrentInHistory();
            }
        } else {
            this.notification(NOTIFY.ERROR, "Chapter Delayed", "The chapter was not updated and saved since it is delayed on MangaDex.", "https://mangadex.org/images/manga/" + this.manga.mangaDexId + ".thumb.jpg");
        }
    }

    titlesListPage() {
        let founds = document.querySelectorAll(".row.m-0.border-bottom");
        let max = founds.length;

        // if there is no table the list is not expanded or simple
        if (max == 0 || !this.options.showTooltips) {
            return;
        }

        // Create the tooltip holder
        this.tooltipContainer = document.createElement("div");
        this.tooltipContainer.id = "mmd-tooltip";
        document.body.appendChild(this.tooltipContainer);

        // Create the tooltips
        for (let i = 1; i < max; i++) {
            let id = /title\/(\d+)\/?.*/.exec(founds[i].firstElementChild.firstElementChild.firstElementChild.children[1].href)[1];
            this.tooltip(founds[i], id);
        }
    }

    async historyPage() {
        if (!this.options.updateHistoryPage) return;
        let container = document.getElementById("history");
        let infoNode = container.querySelector("p");
        infoNode.textContent = ["Your last ", this.options.historySize, " read titles are listed below."].join("");
        // Load history, abort if empty
        let history = await storageGet("history");
        if (history == undefined) {
            history = { list: [] };
            return await storageSet("history", history);
        }
        // Display additionnal history
        for (let i = history.list.length-1; i >= 0; i--) {
            let entry = history[history.list[i]];
            let exist = container.querySelector(["a[href^='/manga/", entry.id, "']"].join(""));
            if (!exist) {
                let entryNode = this.buildHistoryEntryNode(entry);
                container.insertBefore(entryNode, container.lastElementChild);
            }
        }
    }

    // END PAGE
}

let myMangaDex = new MyMangaDex();
myMangaDex.start();
