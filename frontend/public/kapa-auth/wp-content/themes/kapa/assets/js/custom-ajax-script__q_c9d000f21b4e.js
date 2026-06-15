jQuery(document).ready(function($) {
    // AJAX function to update mini-cart count
    function updateMiniCartCount() {
        $.ajax({
            url: customAjax.ajaxUrl,
            type: 'POST',
            data: {
                action: 'kapa_update_mini_cart_count',
                security: customAjax.nonce
            },
            success: function(response) {
                $('.mini-cart-count').text(response);
            },
            error: function(error) {
                console.log(error);
            }
        });
    }

    // AJAX function to update mini-cart count after cart update
    function updateMiniCartCountAfterUpdate() {
        $.ajax({
            url: customAjax.ajaxUrl,
            type: 'POST',
            data: {
                action: 'kapa_update_mini_cart_count_after_update',
                security: customAjax.nonce
            },
            success: function(response) {
                if (response.success) {
                    $('.mini-cart-count').replaceWith(response.data);
                }
            },
            error: function(error) {
                console.log(error);
            }
        });
    }

    // Call the AJAX function when the page loads
    updateMiniCartCount();

    // Trigger mini-cart count update after cart update
    $(document).on('updated_cart_totals', function() {
        updateMiniCartCountAfterUpdate();
    });
});

