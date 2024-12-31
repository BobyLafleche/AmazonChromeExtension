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

            if (!url || (!url.includes("https://www.amazon.fr/gp/css/order-history") &&
                         !url.includes("https://www.amazon.fr/your-orders/orders"))) {
                alert('Vous n\'êtes pas sur la page d\'historique des commandes d\'Amazon.'); // Affichez un pop-up
                return;
            }

            // Injecter un script de contenu pour interagir avec le DOM de la page
            chrome.scripting.executeScript(
                {
                    target: { tabId: currentTab.id },
                    func: scrapeAmazonOrders, // Fonction définie plus bas
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
    function scrapeAmazonOrders() {
        const orders = [];
    
        // Sélecteur principal pour chaque commande
        const orderElements = document.querySelectorAll('.order-card.js-order-card');
    
        if (orderElements.length === 0) {
            console.error('Aucune commande trouvée. Vérifiez les sélecteurs.');
            return [];
        }
    
        orderElements.forEach((order, index) => {
            console.log(`Commande #${index + 1}`, order); // Log de l'élément de commande
    
            // Récupération de l'image du produit
            const imageElement = order.querySelector('.product-image img');
            const imageUrl = imageElement ? imageElement.src : 'Image non disponible';
    
            // Récupération de l'intitulé du produit
            const titleElement = order.querySelector('.yohtmlc-product-title');
            const productTitle = titleElement ? titleElement.textContent.trim() : 'Intitulé non disponible';
    
            // Récupération de la date
            const dateElement = order.querySelectorAll('.a-size-base.a-color-secondary.aok-break-word')[0];
            const date = dateElement ? dateElement.textContent.trim() : 'Date non disponible';
    
            // Récupération du montant total
            const amountElement = order.querySelectorAll('.a-size-base.a-color-secondary.aok-break-word')[1];
            const amount = amountElement ? amountElement.textContent.trim() : 'Montant non disponible';
    
            // Récupération du statut (si disponible)
            const statusElement = order.querySelector('.a-color-secondary.a-text-bold');
            const status = statusElement ? statusElement.textContent.trim() : 'Statut non disponible';
    
            // Log des détails pour le débogage
            console.log(`Commande #${index + 1} - Image: ${imageUrl}`);
            console.log(`Commande #${index + 1} - Titre: ${productTitle}`);
            console.log(`Commande #${index + 1} - Montant: ${amount}`);
            console.log(`Commande #${index + 1} - Date: ${date}`);
            console.log(`Commande #${index + 1} - Statut: ${status}`);
    
            // Ajout des informations extraites à l'objet `orders`
            orders.push({ 
                date, 
                amount, 
                status, 
                productTitle, 
                imageUrl 
            });
        });
    
        console.log('Scraping terminé. Commandes récupérées :', orders);
        return orders; // Retourne les commandes extraites
    }
    
    
    
});