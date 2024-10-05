// ==UserScript==
// @name         GumpChan Thread Image Downloader
// @author       Grimm
// @namespace    http://github.com/fvckgrimm
// @version      1.1
// @description  Adds a download button to gumpchan threads to download all images as a zip file
// @match        https://chan.gumpchan.org/*
// @grant        GM_addStyle
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js
// @updateURL    https://raw.githubusercontent.com/fvckgrimm/gumpchan-downloader-us/raw/main/gumpchan-dl.user.js
// @downloadURL  https://raw.githubusercontent.com/fvckgrimm/gumpchan-downloader-us/raw/main/gumpchan-dl.user.js
// @icon         https://pbs.twimg.com/profile_images/1842219829237104640/NYbs8Yp9_400x400.jpg
// ==/UserScript==

(function() {
    'use strict';

    GM_addStyle(`
        .downloadButton {
            padding: 3px 6px;
            background-color: #151321;
            color: #54C6Df;
            border: 1px solid #54C6Df;
            border-radius: 3px;
            cursor: pointer;
            font-size: 10px;
            font-weight: bold;
            display: inline-flex;
            align-items: center;
            transition: all 0.3s ease;
            margin: 2px;
        }
        .downloadButton:hover {
            background-color: #54C6Df;
            color: #151321;
        }
        .downloadButton::before {
            content: '⭳';
            margin-right: 3px;
            font-size: 12px;
        }
        #downloadAllButton {
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 1000;
            font-size: 12px;
            padding: 5px 10px;
        }
    `);

    function getCorrectImageUrl(img) {
        if (img.parentElement.tagName === 'A') {
            // For home page images
            return img.parentElement.href.replace('/res/', '/src/').split('#')[0];
        } else {
            // For thread and board pages
            const fileInfo = img.closest('.file').querySelector('.fileinfo a');
            return fileInfo ? fileInfo.href : img.src.replace('/thumb/', '/src/');
        }
    }

    async function downloadImages(images, zipFileName) {
        const zip = new JSZip();
        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            const imgUrl = getCorrectImageUrl(img);
            try {
                const response = await fetch(imgUrl);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const blob = await response.blob();
                const fileName = imgUrl.split('/').pop();
                zip.file(fileName, blob);
            } catch (e) {
                console.error(`Failed to fetch image: ${imgUrl}`, e);
            }
        }
        zip.generateAsync({ type: 'blob' }).then(function(content) {
            saveAs(content, zipFileName);
        });
    }

    function addDownloadButtonToThread(thread) {
        const downloadButton = document.createElement('button');
        downloadButton.className = 'downloadButton';
        downloadButton.textContent = 'Download Thread';
        downloadButton.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const images = thread.querySelectorAll('.post-image');
            const threadId = thread.id.split('_')[1];
            const boardName = thread.dataset.board;
            await downloadImages(images, `${boardName}_${threadId}.zip`);
        });
        const intro = thread.querySelector('.intro');
        if (intro) {
            intro.appendChild(downloadButton);
        }
    }

    function addDownloadAllButton() {
        const downloadAllButton = document.createElement('button');
        downloadAllButton.id = 'downloadAllButton';
        downloadAllButton.className = 'downloadButton';
        downloadAllButton.textContent = 'Download All Visible';
        downloadAllButton.addEventListener('click', async () => {
            const allImages = document.querySelectorAll('.thread .post-image');
            const boardName = window.location.pathname.split('/')[1];
            await downloadImages(allImages, `${boardName}_all_visible.zip`);
        });
        document.body.appendChild(downloadAllButton);
    }

    function addHomePageDownloadButton() {
        const downloadButton = document.createElement('button');
        downloadButton.id = 'downloadAllButton';
        downloadButton.className = 'downloadButton';
        downloadButton.textContent = 'Download Recent Images';
        downloadButton.addEventListener('click', async () => {
            const recentImages = document.querySelectorAll('.box.image img');
            await downloadImages(recentImages, 'recent_images.zip');
        });
        document.body.appendChild(downloadButton);
    }

    // Check if we're on the home page, a board page, or a thread page
    const isHomePage = window.location.pathname === '/';
    const isThreadPage = /\/res\//.test(window.location.pathname);

    if (isHomePage) {
        addHomePageDownloadButton();
    } else if (isThreadPage) {
        // For individual thread pages
        const downloadButton = document.createElement('button');
        downloadButton.id = 'downloadButton';
        downloadButton.className = 'downloadButton';
        downloadButton.style.position = 'fixed';
        downloadButton.style.bottom = '10px';
        downloadButton.style.right = '10px';
        downloadButton.textContent = 'Download Thread';
        document.body.appendChild(downloadButton);

        downloadButton.addEventListener('click', async () => {
            const images = document.querySelectorAll('.post-image');
            const boardName = window.location.pathname.split('/')[1];
            const threadId = window.location.pathname.split('/')[3].split('.')[0];
            await downloadImages(images, `${boardName}_${threadId}.zip`);
        });
    } else {
        // For board pages
        const threads = document.querySelectorAll('.thread');
        threads.forEach(addDownloadButtonToThread);
        addDownloadAllButton();
    }
})();
