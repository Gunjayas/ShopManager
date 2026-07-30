CREATE TABLE `bundles` (
	`bundle_id` integer PRIMARY KEY AUTOINCREMENT,
	`order_id` integer NOT NULL,
	`type` text NOT NULL,
	`design_name` text NOT NULL,
	`items_ordered` integer NOT NULL,
	`cost_per_item` integer NOT NULL,
	`bundle_total_cost` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`items_received` integer DEFAULT 0 NOT NULL,
	`arrival_date` text,
	CONSTRAINT `fk_bundles_order_id_orders_order_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`order_id`) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE TABLE `inventory_items` (
	`item_id` integer PRIMARY KEY AUTOINCREMENT,
	`bundle_id` integer NOT NULL,
	`variant` text NOT NULL,
	`cost_price` integer NOT NULL,
	`marked_price` integer NOT NULL,
	`listed_price` integer NOT NULL,
	`target_price` integer NOT NULL,
	`floor_price` integer NOT NULL,
	`max_discount_percent` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'in_stock' NOT NULL,
	CONSTRAINT `fk_inventory_items_bundle_id_bundles_bundle_id_fk` FOREIGN KEY (`bundle_id`) REFERENCES `bundles`(`bundle_id`) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE TABLE `loss_entries` (
	`loss_id` integer PRIMARY KEY AUTOINCREMENT,
	`bundle_id` integer NOT NULL,
	`loss_type` text NOT NULL,
	`items_lost` integer NOT NULL,
	`loss_value` integer NOT NULL,
	`loss_date` text NOT NULL,
	`recovery_status` text DEFAULT 'none' NOT NULL,
	`recovery_value` integer,
	`recovery_date` text,
	CONSTRAINT `fk_loss_entries_bundle_id_bundles_bundle_id_fk` FOREIGN KEY (`bundle_id`) REFERENCES `bundles`(`bundle_id`) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`order_id` integer PRIMARY KEY AUTOINCREMENT,
	`supplier_or_country` text NOT NULL,
	`order_date` text NOT NULL,
	`transportation_fee` integer DEFAULT 0 NOT NULL,
	`expected_bundle_count` integer NOT NULL,
	`status` text DEFAULT 'ongoing' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sales` (
	`sale_id` integer PRIMARY KEY AUTOINCREMENT,
	`item_id` integer NOT NULL UNIQUE,
	`sale_date` text NOT NULL,
	`selling_price` integer NOT NULL,
	`profit` integer NOT NULL,
	CONSTRAINT `fk_sales_item_id_inventory_items_item_id_fk` FOREIGN KEY (`item_id`) REFERENCES `inventory_items`(`item_id`) ON DELETE RESTRICT
);
