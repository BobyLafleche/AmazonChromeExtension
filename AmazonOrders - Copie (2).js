// Fonction pour définir une valeur dans le stockage local de Chrome
function setValue(key, value) {
    var obj = {};
    obj[key] = value;
    chrome.storage.local.set(obj);
}

// Fonction pour obtenir une valeur du stockage local de Chrome
function getValue(key, callback) {
    chrome.storage.local.get(key, function(result) {
        callback(result[key]);
    });
}

var SCRIPT_NAME = 'AmazonOrders',
    DEBUG = true;

// Vérifie si jQuery est chargé
if (typeof jQuery !== 'function') {
    console.error(SCRIPT_NAME + ':', 'Library not found - ', 'jQuery:', typeof jQuery);
    throw new Error('jQuery is not loaded'); // Utiliser throw pour arrêter l'exécution
}

console.log(SCRIPT_NAME + ': jQuery status - ', typeof jQuery); // Log pour vérifier le statut de jQuery
console.log(SCRIPT_NAME + ': Script loaded.'); // Log pour indiquer que le script a été chargé

// Code qui dépend de jQuery
$(document).ready(function() {
    console.log(SCRIPT_NAME + ': Document is ready.'); // Log pour indiquer que le document est prêt
    var $ = jQuery,
        IS_WEB_EXTENSION = !!(window.is_web_extension),
        IS_FIREFOX = (0 <= navigator.userAgent.toLowerCase().indexOf('firefox')),
        IS_EDGE = (0 <= navigator.userAgent.toLowerCase().indexOf('edge')),
        WEB_EXTENSION_INIT = window.web_extension_init,
        ORDER_HISTORY_FILTER = null,
        DEFAULT_OPTIONS = {},
        IS_TOUCHED = (function() {
            var touched_id = SCRIPT_NAME + '_touched',
                jq_touched = $('#' + touched_id);
            if (0 < jq_touched.length) {
                return true;
            }
            $('<b>').attr('id', touched_id).css('display', 'none').appendTo($(document.documentElement));
            return false;
        })();

    console.log(SCRIPT_NAME + ': Variables initialized.'); // Log pour indiquer que les variables sont initialisées

    // Si le script a déjà été chargé, affiche une erreur et arrête l'exécution
    if (IS_TOUCHED) {
        console.error(SCRIPT_NAME + ': Already loaded.');
        return;
    }

    console.log(SCRIPT_NAME + ': Script initialized successfully.');

    // Fonction pour récupérer les commandes Amazon
    function fetchAmazonOrders() {
        console.log(SCRIPT_NAME + ': Fetching Amazon orders...');

        // Vérifiez l'URL de l'onglet actif
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs.length === 0) {
                console.error(SCRIPT_NAME + ': No active tabs found.');
                return;
            }

            const currentTab = tabs[0];
            console.log('currentTab.id :', currentTab.id ); // Affichez l'objet currentTab
            const url = currentTab.url;

            console.log('Current URL: ' + url); // Affichez l'URL

            if (!url || (
                !url.includes("https://www.amazon.fr/gp/css/order-history") &&
                !url.includes("https://www.amazon.fr/your-orders/orders") &&
                !url.includes("https://www.amazon.fr/gp/your-account/order-history")
            )) {

                alert('Vous n\'êtes pas sur la page d\'historique des commandes d\'Amazon.'); // Affichez un pop-up
                return;
            }

            // Injecter un script de contenu pour interagir avec le DOM de la page
            chrome.scripting.executeScript(
                {
                    target: { tabId: currentTab.id },
                    func: scrapeAllAmazonOrders, // Fonction définie plus bas
                },
                (results) => {
                    if (results && results[0].result) {
                        console.log('Commandes récupérées :', results[0].result);
                        alert('Commandes récupérées avec succès ! Consultez la console pour plus de détails.');
                    } else {
                        console.error(SCRIPT_NAME + ': Erreur lors de la récupération des commandes.');
                        alert('Erreur lors de la récupération des commandes.');
                    }
                }
            );

            // Scraping des commandes à partir de la page
            const orders = [];
            $('.order').each(function() {
                const orderDate = $(this).find('.order-date').text().trim(); // Remplacez avec le sélecteur correct
                const orderNumber = $(this).find('.order-number').text().trim(); // Remplacez avec le sélecteur correct
                const orderTotal = $(this).find('.order-total').text().trim(); // Remplacez avec le sélecteur correct

                orders.push({
                    date: orderDate,
                    number: orderNumber,
                    total: orderTotal
                });
            });

            console.log(SCRIPT_NAME + ': Fetched commands:', orders);
            displayOrders(orders); // Appel à la fonction pour afficher les commandes
        });
    }

    // Fonction pour afficher les commandes
    function displayOrders(orders) {
        // Logique pour afficher les commandes
        orders.forEach(order => {
            // Créez des éléments DOM pour chaque commande et ajoutez-les à la page
            console.log(SCRIPT_NAME + ': Displaying order:', order);
        });
    }

    // Fonction pour filtrer les commandes par date
    function filterOrdersByDate(orders, startDate, endDate) {
        return orders.filter(order => {
            const orderDate = new Date(order.date); // Assurez-vous que `order.date` est le bon champ
            return orderDate >= new Date(startDate) && orderDate <= new Date(endDate);
        });
    }


    // Ajout d'un écouteur d'événements pour le bouton de recherche
    document.getElementById('fetchOrders').addEventListener('click', function() {
        // Appel à la fonction pour récupérer les commandes
        fetchAmazonOrders();
    });

    // Fonction injectée sur la page Amazon pour extraire les commandes
    async function scrapeAllAmazonOrders() {
        const orders = [];
    
        // Fonction pour détecter la pagination et récupérer tous les liens des pages
        function getPaginationLinks() {
            const paginationContainer = document.querySelector('.a-pagination');
            if (!paginationContainer) {
                console.log('Pas de pagination détectée, une seule page à scraper.');
                return [];
            }
    
            const pageLinks = Array.from(paginationContainer.querySelectorAll('li.a-normal a, li.a-selected a'));
            const urls = pageLinks.map((link) => link.href);
            console.log('Liens des pages détectés :', urls);
    
            return urls;
        }
    
        // Fonction pour scraper une seule page
        function scrapeCurrentPage() {
            const pageOrders = [];
            const observer = new MutationObserver((mutationsList, observer) => {
                for (let mutation of mutationsList) {
                    if (mutation.type === 'childList') {
                        const newOrderElements = document.querySelectorAll('.order-card.js-order-card');
                        console.log(`New orders detected: ${newOrderElements.length}`);
                        if (newOrderElements.length > 0) {
                            observer.disconnect(); // Stop observing once we have new orders
                            newOrderElements.forEach((order) => {
                                const orderHTML = order.outerHTML; // Get the HTML of the order element
                                console.log(orderHTML); // Log the HTML to the console

                                const isOngoingOrder = order.querySelector('.yo-critical-feature') !== null;

                                let imageUrl = 'Image non disponible';
                                let productTitle = 'Intitulé non disponible';
                                let date = 'Date non disponible';
                                let amount = 'Montant non disponible';
                                let status = 'Statut non disponible';
                                let trackingUrl = 'URL de suivi non disponible';

                                if (isOngoingOrder) {
                                    // Logic for ongoing orders
                                    const imageElement = order.querySelector('.yo-critical-feature');
                                    const titleElement = imageElement;
                                    const amountElement = order.querySelector('.yohtmlc-order-total .value');
                                    const dateElement = order.querySelector('.a-column.a-span4 .value');
                                    const trackingElement = order.querySelector('.a-button-inner a');

                                    if (imageElement) {
                                        imageUrl = imageElement.getAttribute('data-a-hires') || imageUrl;
                                    }
                                    if (titleElement) {
                                        productTitle = titleElement.getAttribute('title') || productTitle;
                                    }
                                    if (amountElement) {
                                        amount = amountElement.textContent.trim() || amount;
                                    }
                                    if (dateElement) {
                                        date = dateElement.textContent.trim() || date;
                                    }
                                    if (trackingElement) {
                                        trackingUrl = trackingElement.href || trackingUrl;
                                    }

                                    status = 'Commande en cours';
                                } else {
                                    // Logic for completed orders
                                    const imageElement = order.querySelector('.product-image img');
                                    const titleElement = order.querySelector('.yohtmlc-product-title');
                                    const amountElement = order.querySelectorAll('.a-size-base.a-color-secondary.aok-break-word')[1];
                                    const dateElement = order.querySelectorAll('.a-size-base.a-color-secondary.aok-break-word')[0];
                                    const statusElement = order.querySelector('.a-color-secondary.a-text-bold');

                                    if (imageElement) {
                                        imageUrl = imageElement.src || imageUrl;
                                    }
                                    if (titleElement) {
                                        productTitle = titleElement.textContent.trim() || productTitle;
                                    }
                                    if (amountElement) {
                                        amount = amountElement.textContent.trim() || amount;
                                    }
                                    if (dateElement) {
                                        date = dateElement.textContent.trim() || date;
                                    }
                                    if (statusElement) {
                                        status = statusElement.textContent.trim() || 'Statut non disponible';
                                    }
                                }

                                console.log(`Order scraped: ${productTitle}, ${date}, ${amount}, ${status}`); // Debugging log
                                pageOrders.push({
                                    date,
                                    amount,
                                    status,
                                    productTitle,
                                    imageUrl,
                                    trackingUrl,
                                });
                            });
                            console.log(`Scraping completed: ${newOrderElements.length} orders found.`);
                        }
                    }
                }
            });

            // Start observing the document for changes
            observer.observe(document.body, { childList: true, subtree: true });
            console.log("Observer started, waiting for changes...");

            return pageOrders; // Ensure the function returns the orders
        }
    
        // Récupérer les liens de toutes les pages
        const paginationLinks = getPaginationLinks();
    
        if (paginationLinks.length === 0) {
            // S'il n'y a pas de pagination, scraper simplement la page actuelle
            orders.push(...scrapeCurrentPage());
        } else {
            // Sinon, scraper chaque page
            for (let i = 0; i < paginationLinks.length; i++) {
                console.log(`Navigation vers la page ${i + 1} : ${paginationLinks[i]}`);
                await fetch(paginationLinks[i])
                    .then((response) => response.text())
                    .then((html) => {
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(html, 'text/html');
                        document.body.innerHTML = doc.body.innerHTML; // Injecter le DOM de la page
                        orders.push(...scrapeCurrentPage());
                    })
                    .catch((error) => console.error(`Erreur lors du chargement de la page ${i + 1} :`, error));
            }
        }
    
        console.log('Scraping terminé sur toutes les pages. Total des commandes récupérées :', orders.length);
        return orders;
    }
});