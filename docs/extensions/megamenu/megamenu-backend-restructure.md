# Megamenu Upgrade and Rework

## Resources
Please refer to [MEGAMENU.md](./MEGAMENU.md) for information relating to the current implementation of the megamenu.

## Overview
This document describes the changes that need to be made to the Medusa backend GUI to provide a more seamless management experience for the Megamenu custom plugin.

I want to remove all of Megamenu options from each of the category pages and keep all of the configuration options on the megamenu extension page.

## Megamenu Config Page

The megamenu config page has global config options in the first section and menu item/category-specific config options in the second section. 

### Global Config Section
Currently shows these options:
1. Layout
2. Tagline
3. Columns JSON
4. Featured JSON
5. Preview
6. Save global configuration

**Required Updates**
It should have a header saying "Global Config" with a sub-header saying "Defaults". There should be some info text underneath saying "These config options will act as defaults for any top-level menu items. To override these settings, configure options for each top-level menu item from the Menu Item Config section below". 

It should then display "Default Menu Layout" and the options should be:
- No menu
- Simple dropdown menu
- Rich columns

Additionaly, 2 (Tagline), 3 (Columns JSON) and 4 (Featured JSON) should only exist as optional fields for each category. Having an option to set these globally makes no sense.

Additionally, Number 5 (Preview) doesn't do anything and never has. Please remove this altogether.

### Menu Items Section

There are some menu options that but they don't accurately represent the config options available. The existing section for configuring individual categories from the megamenu extension page should be removed and replaced by a new "Megamenu Items" section.

The Megamenu Items section should be split into two columns as follows:
1. A tree-style view on the left-hand side taking up ~35% of the available space. The tree structure should represent the actual category structure with child categories appearing inset. All items should be clickable.
2. When clicked, the configurable options for each item should be displayed in the righand options section which should take up the rest of the width. 

The tree view should be pre-populated with the pre-existing category tree, so sub-categories should be visually nested under top-level categories and it should be able to handle three category levels - top-level, second-level and third-level categories. Any categories that are deeper than third-level should not appear in the tree.

#### Top-Level Category Menu Items
There are three potential layouts for each top-level category:
1. No menu
2. Simple text-based dropdown
3. Sub-menu columns

If a top-level category has no children, then no options should be available, just a message advising the user that there are sub-category items available.

If sub-categories exist for a TLC, it should be possible to select either 'dropdown', 'columns' or 'no menu'.

If the simple dropdown is selected for a top-level category item, no further config can be applied to the sub-category menu items.

If columns is selected, then it should be possible to configure second-level menu items.

#### Second-Level Category Menu Items
Second-level category menu items should have configurable options if their parent is set to use columns. In this case, the second-level category menu option should be configurable as:
1. Title, image and description.
2. Third-level category list with icon, title and sub-title.

If no third-level children exist, then it should default to title, image and description. Where this is the case, it should be possible to select the title, image and description. By default it should use the category's title and description. If no image is set, then it should display with no image in the frontend.

If third-level children do exist and the third-level category list option is selected, it should still be possible to set these options so that they're passed to the frontend as part of the JSON object. There should be an optional checkbox for each item that disables its inclusion in the JSON object. This means that the config can be retained for future use even though it won't be included.

#### Third-Level Category Menu Items
Only have configuration options if its parent is set to use third-level category list. If so, the user should be able to select the icon/thumbnail as well as the title and sub-title. If the title is unset, it should use the name of the product. If the sub-title is unset is should use the description, clamped to a suitable character count.

## Development Process
Implementation should include any required changes to the database via migrations.

Changes should be tested using Playwright MCP. The backend is accessible at http://sharewear.local:9000/app. Username `s@sideways.systems`, password `H5n4#Grub3r`.

### Success Criteria
It should be possible to retrieve a JSON object that includes configuration data for all menu items and associated behaviours. The JSON should be parsable by a frontend storefront and include all of the required data to render the megamenu properly and reliably.

Please provide:
- An output of the JSON object returned by the backend API.
- A Playwright screenshot of the global options
- A Playwright screenshot of the Menu Items tree/options section
- A markdown document detailing how to implement this in the storefront (this will be the next task once the backend has been updated)