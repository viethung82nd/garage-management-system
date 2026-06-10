jQuery(document).ready(function($) {
    var ajaxUrl = customAjax && customAjax.ajaxUrl ? customAjax.ajaxUrl : '';
    var isSameOrigin = false;

    try {
        isSameOrigin = ajaxUrl ? new URL(ajaxUrl, window.location.href).origin === window.location.origin : false;
    } catch (e) {
        isSameOrigin = false;
    }

    // In local/static mode we keep the cart count stable and avoid cross-origin noise.
    if (!isSameOrigin) {
        $('.mini-cart-count').text('0');
        return;
    }

    // AJAX function to update mini-cart count
    function updateMiniCartCount() {
        $.ajax({
            url: ajaxUrl,
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
            url: ajaxUrl,
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
