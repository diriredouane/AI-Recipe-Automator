// ===================================================================
// <-- PASTE THE NEW CODE HERE -->
// ===================================================================

/**
 * Allow Rank Math meta fields to be modified via the WordPress REST API.
 * Corrected version with permission check function (auth_callback).
 */
function allow_rank_math_meta_api() {
    // Callback function to check if the user has permission to edit posts.
    $permission_callback = function() {
        return current_user_can('edit_posts');
    };

    // Allow Focus Keyword
    register_post_meta('post', 'rank_math_focus_keyword', array(
        'show_in_rest' => true,
        'single' => true,
        'type' => 'string',
        'auth_callback' => $permission_callback // <-- ADDED LINE
    ));

    // Allow SEO Title
    register_post_meta('post', 'rank_math_title', array(
        'show_in_rest' => true,
        'single' => true,
        'type' => 'string',
        'auth_callback' => $permission_callback // <-- ADDED LINE
    ));

    // Allow SEO Meta Description
    register_post_meta('post', 'rank_math_description', array(
        'show_in_rest' => true,
        'single' => true,
        'type' => 'string',
        'auth_callback' => $permission_callback // <-- ADDED LINE
    ));
}
add_action('init', 'allow_rank_math_meta_api');


// WP CARD RECIPE
// ===================================================================
// FIXED: API Endpoint for WP Recipe Maker (Native Method)
// ===================================================================
add_action( 'rest_api_init', function () {
    register_rest_route( 'custom/v1', '/create-recipe', array(
        'methods' => 'POST',
        'callback' => 'api_create_wprm_recipe_fixed', // Changed name to avoid conflicts
        'permission_callback' => function () {
            return current_user_can( 'edit_posts' );
        }
    ));
});

function api_create_wprm_recipe_fixed( $request ) {
    // 1. Check if the plugin is active
    if ( ! post_type_exists( 'wprm_recipe' ) ) {
        return new WP_Error( 'wprm_missing', 'WP Recipe Maker plugin not active.', array( 'status' => 500 ) );
    }

    $params = $request->get_json_params();

    // 2. Create the Recipe "Post" (Native WordPress Method)
    $recipe_id = wp_insert_post( array(
        'post_type'   => 'wprm_recipe',
        'post_title'  => sanitize_text_field( $params['title'] ),
        'post_status' => 'publish', // The recipe card must be published to be visible
    ));
	
	if ( ! empty( $params['image_id'] ) ) {
        set_post_thumbnail( $recipe_id, intval( $params['image_id'] ) );
    }


    if ( is_wp_error( $recipe_id ) ) {
        return new WP_Error( 'creation_failed', $recipe_id->get_error_message(), array( 'status' => 500 ) );
    }

   // 3. Prepare and Save Ingredients (Fix for Structured Mapping)
    $ingredients = array();
    if ( ! empty( $params['ingredients'] ) ) {
        foreach ( $params['ingredients'] as $ing ) {
            // If it's an object sent by the Google Script
            if ( is_array( $ing ) ) {
                $ingredients[] = array(
                    'amount' => isset($ing['amount']) ? sanitize_text_field($ing['amount']) : '',
                    'unit'   => isset($ing['unit']) ? sanitize_text_field($ing['unit']) : '',
                    'name'   => isset($ing['name']) ? sanitize_text_field($ing['name']) : '',
                    'notes'  => isset($ing['notes']) ? sanitize_text_field($ing['notes']) : '',
                );
            } else {
                // Fallback if it's raw text
                $ingredients[] = array( 'raw' => sanitize_text_field( $ing ) );
            }
        }
    }
    // WPRM wants a "Group" of ingredients
    $ingredients_data = array( array( 'ingredients' => $ingredients ) );
    update_post_meta( $recipe_id, 'wprm_ingredients', $ingredients_data );


    // 4. Prepare and Save Instructions
    $instructions = array();
    if ( ! empty( $params['instructions'] ) ) {
        foreach ( $params['instructions'] as $inst_text ) {
            $instructions[] = array( 'text' => sanitize_textarea_field( $inst_text ) );
        }
    }
    // WPRM wants a "Group" of instructions
    $instructions_data = array( array( 'instructions' => $instructions ) );
    update_post_meta( $recipe_id, 'wprm_instructions', $instructions_data );

    // 5. Save other details (Time, Summary...)
    update_post_meta( $recipe_id, 'wprm_summary', sanitize_textarea_field( $params['summary'] ) );
    update_post_meta( $recipe_id, 'wprm_servings', intval( $params['servings'] ) );
    update_post_meta( $recipe_id, 'wprm_prep_time', intval( $params['prep_time'] ) );
    update_post_meta( $recipe_id, 'wprm_cook_time', intval( $params['cook_time'] ) );
    update_post_meta( $recipe_id, 'wprm_total_time', intval( $params['prep_time'] ) + intval( $params['cook_time'] ) );

    // Success !
    return array(
        'success'   => true,
        'id'        => $recipe_id,
        'shortcode' => '[wprm-recipe id="' . $recipe_id . '"]',
        'edit_link' => admin_url( 'post.php?post=' . $recipe_id . '&action=edit' )
    );
}
