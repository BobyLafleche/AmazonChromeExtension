// content.js
console.log('Content script running on Amazon orders page');

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

console.log('Fetched commands:', orders);

// Envoyer les données à l'extension
chrome.runtime.sendMessage({ orders: orders });
