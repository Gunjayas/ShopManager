PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_inventory_items` (
	`item_id` integer PRIMARY KEY AUTOINCREMENT,
	`bundle_id` integer NOT NULL,
	`variant` text,
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
INSERT INTO `__new_inventory_items`(`item_id`, `bundle_id`, `variant`, `cost_price`, `marked_price`, `listed_price`, `target_price`, `floor_price`, `max_discount_percent`, `status`) SELECT `item_id`, `bundle_id`, `variant`, `cost_price`, `marked_price`, `listed_price`, `target_price`, `floor_price`, `max_discount_percent`, `status` FROM `inventory_items`;--> statement-breakpoint
DROP TABLE `inventory_items`;--> statement-breakpoint
ALTER TABLE `__new_inventory_items` RENAME TO `inventory_items`;--> statement-breakpoint
PRAGMA foreign_keys=ON;