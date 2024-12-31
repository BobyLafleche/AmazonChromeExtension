document.getElementById('group-by-date').addEventListener('click', function() {
    fetchCommands();
});

$(document).ready(function() {
    console.log("popup.js: Document is ready.");

    $('#fetchOrders').on('click', function() {
        console.log("popup.js: Fetch Orders button clicked");
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;

        const commands = fetchAmazonOrders(); 
        console.log('Fetched commands:', commands); // Log des commandes récupérées

        const filteredCommands = commands.filter(command => {
            const commandDate = new Date(command.date); 
            return commandDate >= new Date(startDate) && commandDate <= new Date(endDate); 
        });

        console.log('Filtered commands:', filteredCommands); // Log des commandes filtrées
        displayCommands(filteredCommands); 
    });
});

function fetchAmazonOrders() {
    const orders = [];
    const orderElements = document.querySelectorAll('.order-card.js-order-card'); // Sélecteur pour les éléments de commande

    orderElements.forEach(order => {
        const dateElement = order.querySelector('.a-color-secondary.value');
        const amountElement = order.querySelector('.a-color-secondary.yohtmlc-order-total .value');
        const statusElement = order.querySelector('.a-color-secondary.a-text-bold');

        // Vérifiez si les éléments existent avant d'extraire le texte
        const date = dateElement ? dateElement.textContent.trim() : 'Date non disponible';
        const amount = amountElement ? amountElement.textContent.trim() : 'Montant non disponible';
        const status = statusElement ? statusElement.textContent.trim() : 'Statut non disponible';

        // Récupérer les détails des articles
        const itemDetails = Array.from(order.querySelectorAll('.order-item')).map(item => {
            const itemName = item.querySelector('.a-link-normal') ? item.querySelector('.a-link-normal').textContent.trim() : 'N/A';
            const itemPrice = item.querySelector('.a-color-price') ? item.querySelector('.a-color-price').textContent.trim() : 'N/A';
            return { itemName, itemPrice };
        });

        orders.push({ date, amount, status, itemDetails });
    });

    return orders; // Retourne les commandes trouvées
}

function fetchCommands() {
    const commands = fetchAmazonOrders(); 
    displayCommands(commands);
}

function displayCommands(commands) {
    const commandList = document.getElementById('command-list');
    commandList.innerHTML = '';

    // Regrouper les commandes par date
    const groupedCommands = commands.reduce((acc, command) => {
        const date = command.date;
        if (!acc[date]) {
            acc[date] = 0;
        }
        acc[date] += parseInt(command.amount.replace('$', '')); 
        return acc;
    }, {});

    // Afficher les commandes regroupées
    for (const [date, totalAmount] of Object.entries(groupedCommands)) {
        const div = document.createElement('div');
        div.textContent = `Date: ${date}, Montant total: $${totalAmount}`;
        commandList.appendChild(div);
    }
}

function displayOrders(orders) {
    const orderList = document.getElementById('order-list');
    orderList.innerHTML = '';

    orders.forEach(order => {
        const div = document.createElement('div');
        div.textContent = `Date: ${order.date}, Montant: ${order.amount}, Statut: ${order.status}`;
        orderList.appendChild(div);

        const itemDetailsList = document.createElement('ul');
        order.itemDetails.forEach(item => {
            const itemLi = document.createElement('li');
            itemLi.textContent = `Article: ${item.itemName}, Prix: ${item.itemPrice}`;
            itemDetailsList.appendChild(itemLi);
        });
        orderList.appendChild(itemDetailsList);
    });
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.orders) {
        console.log('Orders received from content script:', request.orders);
        displayOrders(request.orders); // Appel à votre fonction pour afficher les commandes
    }
});

// fetchCommands();
