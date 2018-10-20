const MD_STATUS={READING:1,COMPLETED:2,ON_HOLD:3,PLAN_TO_READ:4,DROPPED:5,RE_READING:6},NOTIFY={ERROR:"error",INFO:"info",SUCCESS:"success"};class MyMangaDex{constructor(){this.pageUrl=window.location.href,this.loggedMyAnimeList=!0,this.csrf="",this.manga={name:"",myAnimeListId:0,lastMangaDexChapter:0,mangaDexId:0,chapterId:0,chapters:[],currentChapter:{chapter:0,volume:0}},this.fetched=!1,this.myAnimeListImage="https://i.imgur.com/oMV2BJt.png"}async start(){this.options=await loadOptions(),-1<this.pageUrl.indexOf("org/follows")||-1<this.pageUrl.indexOf("org/group")&&(-1<this.pageUrl.indexOf("/chapters/")||-1==this.pageUrl.indexOf("/manga/")&&-1==this.pageUrl.indexOf("/comments/"))||-1<this.pageUrl.indexOf("org/user")&&(-1<this.pageUrl.indexOf("/chapters/")||-1==this.pageUrl.indexOf("/manga/"))?this.chaptersListPage():-1<this.pageUrl.indexOf("org/search")||-1<this.pageUrl.indexOf("org/?page=search")||-1<this.pageUrl.indexOf("org/?page=titles")||-1<this.pageUrl.indexOf("org/featured")||-1<this.pageUrl.indexOf("org/titles")||-1<this.pageUrl.indexOf("org/list")||-1<this.pageUrl.indexOf("org/group")&&-1<this.pageUrl.indexOf("/manga/")||-1<this.pageUrl.indexOf("org/user")&&-1<this.pageUrl.indexOf("/manga/")?this.titlesListPage():-1<this.pageUrl.indexOf("org/title")||-1<this.pageUrl.indexOf("org/manga")?this.titlePage():-1<this.pageUrl.indexOf("org/chapter")&&this.singleChapterPage()}async fetchMyAnimeList(){let a=await fetch("https://myanimelist.net/ownlist/manga/"+this.manga.myAnimeListId+"/edit?hideLayout",{method:"GET",redirect:"follow",cache:"no-cache",credentials:"include"}),b=await a.text();this.fetched=!0,this.redirected=a.redirected,"401 Unauthorized"==b?(this.notification(NOTIFY.ERROR,"Not logged in","Log in on MyAnimeList!",this.myAnimeListImage),this.loggedMyAnimeList=!1):(this.csrf=/'csrf_token'\scontent='(.{40})'/.exec(b)[1],this.manga.is_approved=!/class="badresult"/.test(b),this.manga.exist=!/id="queryTitle"/.test(b),this.manga.comments=/add_manga_comments.+>(.*)</.exec(b)[1],this.manga.ask_to_discuss=/add_manga_is_asked_to_discuss.+\s.+value="(\d+)?"\s*selected="selected"/.exec(b),this.manga.ask_to_discuss=null===this.manga.ask_to_discuss?0:parseInt(this.manga.ask_to_discuss[1]),this.manga.lastMyAnimeListChapter=/add_manga_num_read_chapters.+value="(\d+)?"/.exec(b),this.manga.lastMyAnimeListChapter=null===this.manga.lastMyAnimeListChapter?0:parseInt(this.manga.lastMyAnimeListChapter[1]),this.manga.total_reread=/add_manga_num_read_times.+value="(\d+)?"/.exec(b),this.manga.total_reread=null===this.manga.total_reread?0:parseInt(this.manga.total_reread[1]),this.manga.last_volume=/add_manga_num_read_volumes.+value="(\d+)?"/.exec(b),this.manga.last_volume=null===this.manga.last_volume?0:parseInt(this.manga.last_volume[1]),this.manga.retail_volumes=/add_manga_num_retail_volumes.+value="(\d+)?"/.exec(b),this.manga.retail_volumes=null===this.manga.retail_volumes?0:parseInt(this.manga.retail_volumes[1]),this.manga.priority=/add_manga_priority.+\s.+value="(\d+)?"\s*selected="selected"/.exec(b),this.manga.priority=null===this.manga.priority?0:parseInt(this.manga.priority[1]),this.manga.reread_value=/add_manga_reread_value.+\s.+value="(\d+)?"\s*selected="selected"/.exec(b),this.manga.reread_value=null===this.manga.reread_value?"":this.manga.reread_value[1],this.manga.score=/add_manga_score.+\s.+value="(\d+)?"\s*selected="selected"/.exec(b),this.manga.score=null===this.manga.score?"":parseInt(this.manga.score[1]),this.manga.sns_post_type=/add_manga_sns_post_type.+\s.+value="(\d+)?"\s*selected="selected"/.exec(b),this.manga.sns_post_type=null===this.manga.sns_post_type?0:parseInt(this.manga.sns_post_type[1]),this.manga.start_date={},this.manga.start_date.month=parseInt(/add_manga_start_date_month.+\s.+value="(\d+)?"\s*selected="selected"/.exec(b)[1])||"",this.manga.start_date.day=parseInt(/add_manga_start_date_day.+\s.+value="(\d+)?"\s*selected="selected"/.exec(b)[1])||"",this.manga.start_date.year=parseInt(/add_manga_start_date_year.+\s.+value="(\d+)?"\s*selected="selected"/.exec(b)[1])||"",this.manga.finish_date={},this.manga.finish_date.month=parseInt(/add_manga_finish_date_month.+\s.+value="(\d+)?"\s*selected="selected"/.exec(b)[1])||"",this.manga.finish_date.day=parseInt(/add_manga_finish_date_day.+\s.+value="(\d+)?"\s*selected="selected"/.exec(b)[1])||"",this.manga.finish_date.year=parseInt(/add_manga_finish_date_year.+\s.+value="(\d+)?"\s*selected="selected"/.exec(b)[1])||"",this.manga.status=/add_manga_status.+\s.+value="(\d+)?"\s*selected="selected"/.exec(b),this.manga.status=null===this.manga.status?0:parseInt(this.manga.status[1]),this.manga.storage_type=/add_manga_storage_type.+\s.+value="(\d+)?"\s*selected="selected"/.exec(b),this.manga.storage_type=null===this.manga.storage_type?"":this.manga.storage_type[1],this.manga.tags=/add_manga_tags.+>(.*)*</.exec(b)[1]||"",this.manga.is_rereading=/name="add_manga\[is_rereading\]"\s*value="\d*"\s*checked="checked"/.test(b),this.manga.total_volume=parseInt(/id="totalVol">(.*)?<\//.exec(b)[1])||0,this.manga.total_chapter=parseInt(/id="totalChap">(.*)?<\//.exec(b)[1])||0,this.manga.in_list=0<this.manga.status)}async updateMyAnimeList(a=!0,b=1){var c=Math.floor;if(this.loggedMyAnimeList)if(this.manga.is_approved){let d="https://myanimelist.net/ownlist/manga/"+this.manga.myAnimeListId+"/edit?hideLayout",e=this.manga.status;if(a)if(0==this.manga.lastMyAnimeListChapter||0<=this.manga.currentChapter.chapter&&this.manga.currentChapter.chapter>this.manga.lastMyAnimeListChapter){if(this.manga.status=2==this.manga.status||0<this.manga.total_chapter&&this.manga.currentChapter.chapter>=this.manga.total_chapter?2:b,!this.manga.in_list&&6!=this.manga.status&&""==this.manga.start_date.year){let a=new Date;this.manga.start_date.year=a.getFullYear(),this.manga.start_date.month=a.getMonth()+1,this.manga.start_date.day=a.getDate(),this.manga.start_today=!0}if(2==this.manga.status&&""==this.manga.finish_date.year){let a=new Date;this.manga.finish_date.year=a.getFullYear(),this.manga.finish_date.month=a.getMonth()+1,this.manga.finish_date.day=a.getDate(),this.manga.end_today=!0}this.manga.in_list||(d="https://myanimelist.net/ownlist/manga/add?selected_manga_id="+this.manga.myAnimeListId+"&hideLayout",this.manga.in_list=!0,this.manga.started=!0),this.manga.is_rereading&&0<this.manga.total_chapter&&this.manga.currentChapter.chapter>=this.manga.total_chapter&&(this.manga.completed=!0,this.manga.is_rereading=!1,this.manga.total_reread++)}else return void this.notification(NOTIFY.INFO,"Not updated","Last read chapter on MyAnimelist is higher or equal to the current chapter and wasn't updated.","https://mangadex.org/images/manga/"+this.manga.mangaDexId+".thumb.jpg");this.manga.lastMyAnimeListChapter=c(this.manga.currentChapter.chapter);let f="entry_id=0&";if(f+="manga_id="+this.manga.myAnimeListId+"&",f+=encodeURIComponent("add_manga[status]")+"="+this.manga.status+"&",f+=encodeURIComponent("add_manga[num_read_volumes]")+"="+this.manga.currentChapter.volume+"&",f+="last_completed_vol=&",f+=encodeURIComponent("add_manga[num_read_chapters]")+"="+this.manga.lastMyAnimeListChapter+"&",f+=encodeURIComponent("add_manga[score]")+"="+this.manga.score+"&",f+=encodeURIComponent("add_manga[start_date][day]")+"="+this.manga.start_date.day+"&",f+=encodeURIComponent("add_manga[start_date][month]")+"="+this.manga.start_date.month+"&",f+=encodeURIComponent("add_manga[start_date][year]")+"="+this.manga.start_date.year+"&",f+=encodeURIComponent("add_manga[finish_date][day]")+"="+this.manga.finish_date.day+"&",f+=encodeURIComponent("add_manga[finish_date][month]")+"="+this.manga.finish_date.month+"&",f+=encodeURIComponent("add_manga[finish_date][year]")+"="+this.manga.finish_date.year+"&",f+=encodeURIComponent("add_manga[tags]")+"="+encodeURIComponent(this.manga.tags)+"&",f+=encodeURIComponent("add_manga[priority]")+"="+this.manga.priority+"&",f+=encodeURIComponent("add_manga[storage_type]")+"="+this.manga.storage_type+"&",f+=encodeURIComponent("add_manga[num_retail_volumes]")+"="+this.manga.retail_volumes+"&",f+=encodeURIComponent("add_manga[num_read_times]")+"="+this.manga.total_reread+"&",f+=encodeURIComponent("add_manga[reread_value]")+"="+this.manga.reread_value+"&",f+=encodeURIComponent("add_manga[comments]")+"="+encodeURIComponent(this.manga.comments)+"&",f+=encodeURIComponent("add_manga[is_asked_to_discuss]")+"="+this.manga.ask_to_discuss+"&",f+=encodeURIComponent("add_manga[sns_post_type]")+"="+this.manga.sns_post_type+"&",this.manga.is_rereading&&(f+=encodeURIComponent("add_manga[is_rereading]")+"=1&"),f+="submitIt=0&",f+=encodeURIComponent("csrf_token")+"="+this.csrf,await fetch(d,{method:"POST",body:f,redirect:"follow",credentials:"include",headers:{"Content-Type":"application/x-www-form-urlencoded",accept:"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"}}),a&&(6==this.manga.status?this.notification(NOTIFY.SUCCESS,"Added to Plan to Read",this.manga.name+" as been put in your endless Plan to read list !","https://mangadex.org/images/manga/"+this.manga.mangaDexId+".thumb.jpg"):("started"in this.manga?(this.notification(NOTIFY.SUCCESS,"Manga updated","You started reading "+this.manga.name,"https://mangadex.org/images/manga/"+this.manga.mangaDexId+".thumb.jpg"),"start_today"in this.manga&&this.notification(NOTIFY.SUCCESS,"Started manga","The start date of "+this.manga.name+" was set to today.","https://mangadex.org/images/manga/"+this.manga.mangaDexId+".thumb.jpg")):0<this.manga.lastMyAnimeListChapter&&(2!=this.manga.status||2==this.manga.status&&this.manga.is_rereading)&&this.notification(NOTIFY.SUCCESS,"Manga updated",this.manga.name+" as been updated to chapter "+this.manga.lastMyAnimeListChapter+(0<this.manga.total_chapter?" out of "+this.manga.total_chapter:""),"https://mangadex.org/images/manga/"+this.manga.mangaDexId+".thumb.jpg"),2==this.manga.status&&!this.manga.is_rereading&&(this.notification(NOTIFY.SUCCESS,"Manga updated",this.manga.name+" was set as completed.","https://mangadex.org/images/manga/"+this.manga.mangaDexId+".thumb.jpg"),"end_today"in this.manga&&this.notification(NOTIFY.SUCCESS,"Manga completed","The finish date of "+this.manga.name+" was set to today.","https://mangadex.org/images/manga/"+this.manga.mangaDexId+".thumb.jpg")))),this.options.updateMDList&&this.manga.status!=e||void 0!==this.manga.completed)switch(this.manga.status){case 1:await this.updateMangaDexList("manga_follow",MD_STATUS.READING);break;case 2:await this.updateMangaDexList("manga_follow",MD_STATUS.COMPLETED);break;case 3:await this.updateMangaDexList("manga_follow",MD_STATUS.ON_HOLD);break;case 4:await this.updateMangaDexList("manga_follow",MD_STATUS.DROPPED);break;case 6:await this.updateMangaDexList("manga_follow",MD_STATUS.PLAN_TO_READ);}}else this.notification(NOTIFY.INFO,"Not updated","The manga is still pending approval on MyAnimelist and can't be updated.",this.myAnimeListImage)}async quickAddOnMyAnimeList(a){this.informationsNode.textContent="Loading...",this.fetched||(await this.fetchMyAnimeList()),await this.updateMyAnimeList(!0,a),this.insertMyAnimeListInformations()}async updateMangaDexList(a,b){let c=new Date().getTime();try{await fetch("https://mangadex.org/ajax/actions.ajax.php?function="+a+"&id="+this.manga.mangaDexId+"&type="+b+"&_="+c,{method:"GET",redirect:"follow",credentials:"include",headers:{"X-Requested-With":"XMLHttpRequest"}}),this.notification(NOTIFY.SUCCESS,"Status on MangaDex updated")}catch(a){this.notification(NOTIFY.ERROR,"Error updating MDList")}}getVolumeChapterFromNode(a){let b=a.getAttribute("data-chapter");return""==b?this.getVolumeChapterFromString(a.children[1].textContent):{volume:parseInt(a.getAttribute("data-volume"))||0,chapter:parseFloat(b)||1}}getVolumeChapterFromString(a){let b=/(?:Vol(?:[.]|ume)\s([0-9]+)\s)?(?:Ch(?:[.]|apter)\s)?([0-9]+)([.][0-9]+)?/.exec(a);return null==b&&(b=[0,0,1,void 0]),{volume:parseInt(b[1])||0,chapter:parseFloat(b[2]+""+b[3])}}appendTextWithIcon(a,b,c){let d=document.createElement("span");d.className="fas fa-"+b+" fa-fw",d.setAttribute("aria-hidden",!0),a.appendChild(d),a.appendChild(document.createTextNode(" "+c))}tooltip(a,b,c=void 0){var d=Math.min;let e=document.createElement("div");e.className="mmd-tooltip",e.style.width="100px",e.style.left="-1000px",this.tooltipContainer.appendChild(e);let f=document.createElement("img");if(e.appendChild(f),this.options.saveAllOpened&&void 0!==c&&void 0!==c.chapters&&0<c.chapters.length){f.className="mmd-tooltip-image";let a=document.createElement("div");a.className="mmd-tooltip-content";let b=d(5,c.chapters.length);for(let d=0;d<b;d++)this.appendTextWithIcon(a,"eye",c.chapters[d]),a.appendChild(document.createElement("br"));e.appendChild(a)}f.addEventListener("load",()=>{let a=f.getBoundingClientRect();e.style.width=a.width+2+"px"});let g=!1;a.addEventListener("mouseenter",async()=>{g||(f.src=(await"https://mangadex.org/images/manga/")+b+".thumb.jpg",g=!0),e.classList.add("mmd-active");let c=a.getBoundingClientRect(),d=e.getBoundingClientRect();e.style.left=c.x-d.width-5+"px",e.style.top=c.y+c.height/2+window.scrollY-d.height/2+"px"}),a.addEventListener("mouseleave",()=>{e.classList.remove("mmd-active"),e.style.left="-1000px"})}highlightChapters(){let a=document.querySelector(".chapter-container").children;for(let b=1;b<a.length;b++){let c=a[b],d=this.getVolumeChapterFromNode(c.firstElementChild.firstElementChild);if(this.manga.lastMyAnimeListChapter==parseInt(d.chapter))c.style.backgroundColor=this.options.lastReadColor;else if(this.manga.lastMangaDexChapter==d.chapter)c.style.backgroundColor=this.options.lastOpenColors[0];else if(this.options.saveAllOpened){let a=this.manga.chapters.find(a=>a==d.chapter);a!==void 0&&(c.style.backgroundColor=this.options.openedChaptersColor)}}}addModalLabel(a,b){let c=document.createElement("div");c.className="row form-group";let d=document.createElement("label");d.className="col-sm-3 col-form-label",d.textContent=b,c.appendChild(d);let e=document.createElement("div");return e.className="col px-0 my-auto",c.appendChild(e),a.appendChild(c),e}addModalInput(a,b,c,d,e={}){let f=document.createElement(b);if(f.className="form-control",f.value=d,f.dataset.mal=c,a.appendChild(f),"input"!=b)"select"==b?("number"in e&&(f.dataset.number=!0),e.elements.forEach(a=>{let b=document.createElement("option");b.value="value"in a?a.value:a.text,b.textContent=a.text||a.value,d==b.value&&(b.selected=!0),f.appendChild(b)})):"textarea"==b&&(f.placeholder=e.placeholder);else if(f.type=e.type,"number"==e.type&&(f.min=e.min,f.max=e.max,f.dataset.number=!0),"checkbox"!=e.type)f.placeholder=e.placeholder;else{a.className="custom-control custom-checkbox form-check",f.id=c,f.className="custom-control-input",f.checked=d;let b=document.createElement("label");b.className="custom-control-label",b.textContent=e.label,b.setAttribute("for",c),a.appendChild(b)}}addModalRow(a,b,c,d,e,f={}){let g=this.addModalLabel(a,b);return"placeholder"in f||(f.placeholder=b),this.addModalInput(g,c,d,e,f),g}createMyAnimeListModal(){let a=document.createElement("div");a.id="modal-mal",a.className="modal show-advanced",a.tabIndex=-1,a.role="dialog";let b=document.createElement("div");b.className="modal-dialog modal-lg",b.role="document",a.appendChild(b);let c=document.createElement("div");c.className="modal-content",b.appendChild(c);let d=document.createElement("div");d.className="modal-header",c.appendChild(d);let e=document.createElement("h4");e.className="modal-title",e.textContent="MyAnimeList Informations",d.appendChild(e);let f=document.createElement("button");f.type="button",f.className="close",f.dataset.dismiss="modal",f.textContent="\xD7",d.appendChild(f);let g=document.createElement("div");g.className="modal-body",c.appendChild(g);let h=document.createElement("div");h.className="container",g.appendChild(h);let i=this.addModalLabel(h,"Title"),j=document.createElement("a");j.textContent=this.manga.name,j.href="https://myanimelist.net/manga/"+this.manga.myAnimeListId,i.appendChild(j),this.addModalRow(h,"Status","select","status",this.manga.status,{number:!0,elements:[{value:1,text:"Reading"},{value:2,text:"Completed"},{value:3,text:"On-Hold"},{value:4,text:"Dropped"},{value:6,text:"Plan to Read"}]});let k=this.addModalRow(h,"Volumes Read","input","currentChapter.volume",this.manga.last_volume,{type:"number",min:0,max:9999});k.classList.add("input-group");let l=document.createElement("div");l.className="input-group-append";let m=document.createElement("span");m.className="input-group-text",m.textContent="of "+this.manga.total_volume,l.appendChild(m),k.appendChild(l);let n=this.addModalRow(h,"Chapters Read","input","currentChapter.chapter",this.manga.lastMyAnimeListChapter,{type:"number",min:0,max:9999});n.classList.add("input-group");let o=document.createElement("div");o.className="input-group-append";let p=document.createElement("span");p.className="input-group-text",p.textContent="of "+this.manga.total_chapter,o.appendChild(p),n.appendChild(o),this.addModalRow(h,"","input","is_rereading",this.manga.is_rereading,{type:"checkbox",label:"Re-reading"}),this.addModalRow(h,"Your score","select","score",this.manga.score,{number:!0,elements:[{value:"",text:"Select score"},{value:10,text:"(10) Masterpiece"},{value:9,text:"(9) Great"},{value:8,text:"(8) Very Good"},{value:7,text:"(7) Good"},{value:6,text:"(6) Fine"},{value:5,text:"(5) Average"},{value:4,text:"(4) Bad"},{value:3,text:"(3) Very Bad"},{value:2,text:"(2) Horrible"},{value:1,text:"(1) Appalling"}]});let q=[{value:"",text:""},{value:1,text:"Jan"},{value:2,text:"Feb"},{value:3,text:"Mar"},{value:4,text:"Apr"},{value:5,text:"May"},{value:6,text:"June"},{value:7,text:"Jul"},{value:8,text:"Aug"},{value:9,text:"Sep"},{value:10,text:"Oct"},{value:11,text:"Nov"},{value:12,text:"Dec"}],r=[{value:""},{value:1},{value:2},{value:3},{value:4},{value:5},{value:6},{value:7},{value:8},{value:9},{value:10},{value:11},{value:12},{value:13},{value:14},{value:15},{value:16},{value:17},{value:18},{value:19},{value:20},{value:21},{value:22},{value:23},{value:24},{value:25},{value:26},{value:27},{value:28},{value:29},{value:30},{value:31}],s=[{value:""},{value:2018},{value:2017},{value:2016},{value:2015},{value:2014},{value:2013},{value:2012},{value:2011},{value:2010},{value:2009},{value:2008},{value:2007},{value:2006},{value:2005},{value:2004},{value:2003},{value:2002},{value:2001},{value:2e3}],t=this.addModalLabel(h,"Start date");t.className="col px-0 my-auto form-inline",t.appendChild(document.createTextNode("Day: ")),this.addModalInput(t,"select","start_date.day",this.manga.start_date.day,{number:!0,elements:r}),t.appendChild(document.createTextNode(" Month: ")),this.addModalInput(t,"select","start_date.month",this.manga.start_date.month,{number:!0,elements:q}),t.appendChild(document.createTextNode(" Year: ")),this.addModalInput(t,"select","start_date.year",this.manga.start_date.year,{number:!0,elements:s});let u=this.addModalLabel(h,"Finish date");u.className="col px-0 my-auto form-inline",u.appendChild(document.createTextNode("Day: ")),this.addModalInput(u,"select","finish_date.day",this.manga.finish_date.day,{number:!0,elements:r}),u.appendChild(document.createTextNode(" Month: ")),this.addModalInput(u,"select","finish_date.month",this.manga.finish_date.month,{number:!0,elements:q}),u.appendChild(document.createTextNode(" Year: ")),this.addModalInput(u,"select","finish_date.year",this.manga.finish_date.year,{number:!0,elements:s}),this.addModalRow(h,"Tags","textarea","tags",this.manga.tags),this.addModalRow(h,"Priority","select","priority",this.manga.priority,{number:!0,elements:[{value:0,text:"Low"},{value:1,text:"Medium"},{value:2,text:"High"}]}),this.addModalRow(h,"Storage","select","storage_type",this.manga.storage_type,{number:!0,elements:[{value:"",text:"None"},{value:1,text:"Hard Drive"},{value:6,text:"External HD"},{value:7,text:"NAS"},{value:8,text:"Blu-ray"},{value:2,text:"DVD / CD"},{value:4,text:"Retail Manga"},{value:5,text:"Magazine"}]}),this.addModalRow(h,"How many volumes ?","input","retail_volumes",this.manga.retail_volumes,{type:"number",min:0,max:999}),this.addModalRow(h,"Total times re-read","input","total_reread",this.manga.total_reread,{type:"number",min:0,max:999}),this.addModalRow(h,"Re-read value","select","reread_value",this.manga.reread_value,{number:!0,elements:[{value:"",text:"Select reread value"},{value:1,text:"Very Low"},{value:2,text:"Low"},{value:3,text:"Medium"},{value:4,text:"High"},{value:5,text:"Very High"}]}),this.addModalRow(h,"Comments","textarea","comments",this.manga.comments),this.addModalRow(h,"Ask to discuss?","select","ask_to_discuss",this.manga.ask_to_discuss,{number:!0,elements:[{value:0,text:"Ask to discuss a chapter after you update the chapter #"},{value:1,text:"Don't ask to discuss"}]}),this.addModalRow(h,"Post to SNS","select","sns_post_type",this.manga.sns_post_type,{number:!0,elements:[{value:0,text:"Follow default setting"},{value:1,text:"Post with confirmation"},{value:2,text:"Post every time (without confirmation)"},{value:3,text:"Do not post"}]});let v=document.createElement("div");v.className="modal-footer",g.appendChild(v);let w=document.createElement("button");w.type="button",w.className="btn btn-success",this.appendTextWithIcon(w,"save","Save"),w.addEventListener("click",async()=>{h.querySelectorAll("[data-mal]").forEach(a=>{let b=a.dataset.mal.split(".");"type"in a&&"checkbox"==a.type?this.manga[a.dataset.mal]=a.checked:2==b.length?this.manga[b[0]][b[1]]=parseInt(a.value)||a.value:this.manga[a.dataset.mal]="number"in a.dataset&&""!=a.value?parseInt(a.value):a.value}),await this.updateMyAnimeList(!1),this.informationsNode!=null&&this.insertMyAnimeListInformations(),this.notification(NOTIFY.SUCCESS,"Manga Updated",void 0,this.myAnimeListImage),CHROME?$("#modal-mal").modal("hide"):(window.wrappedJSObject.jQuery("#modal-mal").modal("hide"),XPCNativeWrapper(window.wrappedJSObject.jQuery)),this.highlightChapters()}),v.appendChild(w),document.body.appendChild(a)}insertMyAnimeListButton(a=void 0){this.createMyAnimeListModal();var b=document.createElement("a");b.title="Edit on MyAnimeList",b.dataset.toggle="modal",b.dataset.target="modal-mal",a===void 0?(b.className="btn btn-secondary float-right mr-1",this.appendTextWithIcon(b,"edit","Edit on MyAnimeList")):(b.className="btn btn-secondary col m-1",this.appendTextWithIcon(b,"edit","")),b.addEventListener("click",()=>{document.querySelector("[data-mal='status']").value=this.manga.status,document.querySelector("[data-mal='currentChapter.volume']").value=this.manga.last_volume,document.querySelector("[data-mal='currentChapter.chapter']").value=this.manga.lastMyAnimeListChapter,document.querySelector("[data-mal='is_rereading']").checked=this.manga.is_rereading,document.querySelector("[data-mal='start_date.day']").value=this.manga.start_date.day,document.querySelector("[data-mal='start_date.month']").value=this.manga.start_date.month,document.querySelector("[data-mal='start_date.year']").value=this.manga.start_date.year,document.querySelector("[data-mal='finish_date.day']").value=this.manga.finish_date.day,document.querySelector("[data-mal='finish_date.month']").value=this.manga.finish_date.month,document.querySelector("[data-mal='finish_date.year']").value=this.manga.finish_date.year,document.querySelector("[data-mal='total_reread']").value=this.manga.total_reread,window.wrappedJSObject.jQuery("#modal-mal").modal(),XPCNativeWrapper(window.wrappedJSObject.jQuery)}),a===void 0?this.informationsNode.appendChild(b):a.appendChild(b)}insertMyAnimeListInformations(){if(clearDomNode(this.informationsNode),CHROME||this.insertMyAnimeListButton(),2==this.manga.status&&!this.manga.is_rereading){let a=document.createElement("a");a.title="Re-read",a.className="btn btn-secondary float-right mr-1",this.appendTextWithIcon(a,"book-open","Re-read"),a.addEventListener("click",async()=>{this.manga.currentChapter.chapter=0,this.manga.lastMyAnimeListChapter=0,this.manga.currentChapter.volume=0,this.manga.last_volume=0,this.manga.is_rereading=1,await this.updateMyAnimeList(!1),this.insertMyAnimeListInformations(),this.notification(NOTIFY.SUCCESS,"Re-reading","You started re-reading "+this.manga.name,"https://mangadex.org/images/manga/"+this.manga.mangaDexId+".thumb.jpg"),this.options.updateMDList&&(await this.updateMangaDexList("manga_follow",MD_STATUS.RE_READING))}),this.informationsNode.appendChild(a)}let a=[{color:"blueviolet",text:"Not on the list"},{color:"cornflowerblue",text:"Reading"},{color:"darkseagreen",text:"Completed"},{color:"orange",text:"On-Hold"},{color:"firebrick",text:"Dropped"},null,{color:"violet",text:"Plan to Read"}],b=document.createElement("span");b.style.color=a[this.manga.status].color,b.textContent=a[this.manga.status].text,this.informationsNode.appendChild(b),this.informationsNode.appendChild(document.createElement("br")),this.appendTextWithIcon(this.informationsNode,"book","Volume "+this.manga.last_volume+(0<parseInt(this.manga.total_volume)?" out of "+this.manga.total_volume:"")),this.informationsNode.appendChild(document.createElement("br")),this.appendTextWithIcon(this.informationsNode,"bookmark","Chapter "+this.manga.lastMyAnimeListChapter+(0<parseInt(this.manga.total_chapter)?" out of "+this.manga.total_chapter:"")+(this.manga.is_rereading?" - Re-reading":"")),this.informationsNode.appendChild(document.createElement("br")),""!=this.manga.start_date.year&&(this.appendTextWithIcon(this.informationsNode,"calendar-alt","Start date "+this.manga.start_date.year+"/"+this.manga.start_date.month+"/"+this.manga.start_date.day),this.informationsNode.appendChild(document.createElement("br"))),2==this.manga.status&&""!=this.manga.finish_date.year&&(this.appendTextWithIcon(this.informationsNode,"calendar-alt","Finish date "+this.manga.finish_date.year+"/"+this.manga.finish_date.month+"/"+this.manga.finish_date.day),this.informationsNode.appendChild(document.createElement("br")));let c;c=""==this.manga.score?"Not scored yet":"Scored "+this.manga.score+" out of 10",this.appendTextWithIcon(this.informationsNode,"star",c)}async searchMyAnimeListID(){let a=await storageGet(this.manga.mangaDexId);if(a===void 0){this.notification(NOTIFY.INFO,"No MyAnimeList ID in storage","Searching on the manga page of "+this.manga.name+" to find a MyAnimeList id.");try{let a=await fetch("https://mangadex.org/title/"+this.manga.mangaDexId,{method:"GET",cache:"no-cache"}),b=await a.text(),c=/<a.+href='(.+)'>MyAnimeList<\/a>/.exec(b);null===c?this.notification(NOTIFY.ERROR,"No MyAnimeList id found","You will need to go on the manga page if one is added.\nLast open chapters are still saved.",void 0,!0):this.manga.myAnimeListId=parseInt(/.+\/(\d+)/.exec(c[1])[1])}catch(a){this.notification(NOTIFY.ERROR,"Error fetching MangaDex title page")}}else this.manga.myAnimeListId=a.mal,this.manga.lastMangaDexChapter=a.last,this.manga.chapters=a.chapters||[];this.myAnimeListChecked=!0}insertChapter(a){if(-1===this.manga.chapters.indexOf(a))if(0==this.manga.chapters.length)this.manga.chapters.push(a);else{let b=0,c=this.manga.chapters.length,d=!0;for(;b<c&&d;)this.manga.chapters[b]<a?d=!1:b++;for(this.manga.chapters.splice(b,0,a);this.manga.chapters.length>this.options.maxChapterSaved;)this.manga.chapters.pop()}}notification(a,b,c=void 0,d=void 0,e=!1){if(this.options.showNotifications||a==NOTIFY.ERROR&&this.options.showErrors){let f={title:b};c!==void 0&&(f.text=c),d!==void 0&&(f.image=d),e&&(f.sticky=!0),vNotify[a].call(null,f)}}paintOrHide(a,b,c,d){let e;if(a!==void 0){e={chapters:a.chapters};let b=this.options.lastOpenColors;if(1==c.length)c[0].currentChapter.chapter==a.last&&this.options.highlightChapters?(c[0].row.style.backgroundColor=b[d.current],d.current=(d.current+1)%d.max):c[0].currentChapter.chapter<a.last&&(this.options.hideLowerChapters?c[0].row.parentElement.removeChild(c[0].row):this.options.highlightChapters&&(c[0].row.style.backgroundColor=this.options.lowerChaptersColor));else{let e=!1;for(let f in c){let g=c[f].currentChapter.chapter,h=c[f].row;g>a.last&&e&&this.options.highlightChapters?h.firstElementChild.style.backgroundColor=b[d.current]:g<a.last?e&&0==f?h.firstElementChild.style.backgroundColor=b[d.current]:this.options.hideLowerChapters?h.parentElement.removeChild(h):this.options.highlightChapters&&(h.style.backgroundColor=this.options.lowerChaptersColor):g==a.last&&(e=!0,this.options.highlightChapters&&(h.style.backgroundColor=b[d.current]))}}d.current=(d.current+1)%d.max}this.options.showTooltips&&0<c.length&&this.tooltip(c[c.length-1].row,b,e)}async chaptersListPage(){let a=document.querySelector(".chapter-container").children;var b=[],c={current:0,max:this.options.lastOpenColors.length},d={};this.options.showTooltips&&(this.tooltipContainer=document.createElement("div"),this.tooltipContainer.id="mmd-tooltip",document.body.appendChild(this.tooltipContainer));let e=a.length-1;for(let f,g=e;0<g;--g)if(f=a[g],b.push({row:g,currentChapter:this.getVolumeChapterFromNode(f.lastElementChild.firstElementChild)}),0<f.firstElementChild.childElementCount){let e=parseInt(/\/title\/(\d+)\//.exec(f.firstElementChild.firstElementChild.href)[1]),g=JSON.parse(JSON.stringify(b));g.forEach(b=>{b.row=a[b.row]}),void 0===d[e]?storageGet(e).then(a=>{d[e]=a,this.paintOrHide(a,e,g,c)}):this.paintOrHide(d[e],e,g,c),b=[]}}async titlePage(){var a=Math.max;this.manga.name=document.querySelector("h6[class='card-header']").textContent.trim(),this.manga.mangaDexId=/.+title\/(\d+)/.exec(this.pageUrl);let b=document.querySelector("img[src='/images/misc/mal.png'");if(null===this.manga.mangaDexId){let a=document.getElementById("1");null!==a&&(this.manga.mangaDexId=parseInt(a.dataset.mangaId))}else this.manga.mangaDexId=parseInt(this.manga.mangaDexId[1]);let c=await storageGet(this.manga.mangaDexId),d=!1;void 0===c?(d=!0,null!==b&&(b=b.nextElementSibling.href,this.manga.myAnimeListId=parseInt(/.+\/(\d+)/.exec(b)[1])),await updateLocalStorage(this.manga,this.options)):(this.manga.myAnimeListId=c.mal,0==this.manga.myAnimeListId&&null!==b&&(b=b.nextElementSibling.href,this.manga.myAnimeListId=parseInt(/.+\/(\d+)/.exec(b)[1]),d=!0),this.manga.lastMangaDexChapter=c.last,this.manga.chapters=c.chapters||[],this.manga.currentChapter.chapter=this.manga.lastMangaDexChapter);let e=document.querySelector(".col-xl-9.col-lg-8.col-md-7"),f=document.createElement("div");f.className="row m-0 py-1 px-0 border-top",e.insertBefore(f,e.lastElementChild);let g=document.createElement("div");if(g.className="col-lg-3 col-xl-2 strong",g.textContent="Status:",f.appendChild(g),this.informationsNode=document.createElement("div"),this.informationsNode.className="col-lg-9 col-xl-10",f.appendChild(this.informationsNode),!(0<this.manga.myAnimeListId)){let a=document.createElement("span");a.className="alert-info p-1 rounded",a.textContent="No MyAnimeList found. When one is added, MyMangaDex will find it, don't worry.",this.informationsNode.appendChild(a)}else if(await this.fetchMyAnimeList(),this.loggedMyAnimeList)if(!this.manga.is_approved){let a=document.createElement("span");a.className="alert-info p-1 rounded",a.textContent="The manga is still pending approval on MyAnimelist and can't be updated",this.informationsNode.appendChild(a)}else if(!1==this.redirected)this.insertMyAnimeListInformations(),d&&(this.manga.currentChapter.chapter=a(this.manga.lastMyAnimeListChapter,this.manga.lastMangaDexChapter),this.insertChapter(this.manga.currentChapter.chapter),await updateLocalStorage(this.manga,this.options));else{let a=document.createElement("button");a.className="btn btn-default",a.textContent="Start Reading",a.addEventListener("click",async()=>{await this.quickAddOnMyAnimeList(1)});let b=document.createElement("button");b.className="btn btn-default",b.textContent="Add to Plan to Read list",b.addEventListener("click",async()=>{await this.quickAddOnMyAnimeList(6)}),this.informationsNode.appendChild(a),this.informationsNode.appendChild(document.createTextNode(" ")),this.informationsNode.appendChild(b)}this.highlightChapters()}async singleChapterPage(){let a=document.querySelector("meta[property='og:title']").content;if(this.manga.currentChapter=this.getVolumeChapterFromString(a),this.manga.name=/.*\((.+)\)/.exec(a)[1],a=document.querySelector("meta[property='og:image']").content,this.manga.mangaDexId=parseInt(/manga\/(\d+)\.thumb.+/.exec(a)[1]),this.manga.chapterId=parseInt(document.querySelector("meta[name='app']").dataset.chapterId),0==document.getElementsByClassName("card-header").length){var b=new MutationObserver(async a=>{for(var b of a)if("attributes"==b.type){let a=parseInt(document.querySelector(".chapter-title").dataset.chapterId);if(this.manga.chapterId!=a){this.manga.chapterId=a;let b=await fetch("https://mangadex.org/api/chapter/"+this.manga.chapterId);b=await b.json(),"delayed"===b.status?this.notification(NOTIFY.ERROR,"Chapter Delayed","The chapter was not updated and saved since it is delayed on MangaDex.","https://mangadex.org/images/manga/"+this.manga.mangaDexId+".thumb.jpg"):(this.manga.currentChapter.chapter=parseFloat(b.chapter),this.manga.currentChapter.volume=parseInt(b.volume)||0,this.myAnimeListChecked&&0<this.manga.myAnimeListId&&this.updateMyAnimeList(),this.options.saveAllOpened&&this.insertChapter(this.manga.currentChapter.chapter),await updateLocalStorage(this.manga,this.options))}}});b.observe(document.querySelector(".chapter-title"),{attributes:!0})}let c=0<document.getElementsByClassName("alert alert-danger text-center m-auto").length;await this.searchMyAnimeListID(),c?this.notification(NOTIFY.ERROR,"Chapter Delayed","The chapter was not updated and saved since it is delayed on MangaDex.","https://mangadex.org/images/manga/"+this.manga.mangaDexId+".thumb.jpg"):(this.options.saveAllOpened&&this.insertChapter(this.manga.currentChapter.chapter),0<this.manga.myAnimeListId&&(await this.fetchMyAnimeList(),this.manga.exist&&this.manga.is_approved&&(await this.updateMyAnimeList(),!CHROME&&this.insertMyAnimeListButton(document.querySelector(".reader-controls-actions.col-auto.row.no-gutters.p-1").lastElementChild))),await updateLocalStorage(this.manga,this.options))}titlesListPage(){try{let a=document.querySelectorAll(".row.m-0.border-bottom"),b=a.length;if(console.log(b),0==b||!this.options.showTooltips)return;this.tooltipContainer=document.createElement("div"),this.tooltipContainer.id="mmd-tooltip",document.body.appendChild(this.tooltipContainer);for(let c,d=1;d<b;d++)c=/title\/(\d+)\/?.*/.exec(a[d].firstElementChild.firstElementChild.firstElementChild.children[1].href)[1],this.tooltip(a[d],c)}catch(a){console.error(a)}}}let myMangaDex=new MyMangaDex;myMangaDex.start();