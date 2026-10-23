# DATABASE_SCHEMA_REFERENCE

Generated from a **read-only** baseline. No data values or credentials are included.

| Item | Value |
|---|---|
| Schema | `neat_portal` |
| Local server | MySQL 8.0.46 (dump origin: MariaDB 10.4.27, see BASELINE_REPORT) |
| Captured | 2026-10-23T18:31:53.202Z |
| tables | 48 |
| columns | 621 |
| indexEntries | 88 |
| constraints | 76 |
| foreignKeys | 9 |
| routines | 0 |
| triggers | 0 |
| views | 0 |
| hash.structure | `9fbd3dadd84a6cf898b1f7d1c1c5680a7ad3f52fadd1d0c63150867c90c0be6d` |
| hash.createStatements | `d07a9c16492d0bd72b7882e1a405c60ade4ad4401e6dd80852ba943803b5031d` |
| hash.data | `f16d92890221bd64209ce5b268fe289fcdce6039596482456f357311f5dff291` |

## Engine-level objects

- Views: 0, triggers: 0, stored routines: 0.
- Foreign keys: 9.

## Tables without a PRIMARY KEY

- `faqs`
- `institute`
- `learner`
- `password_resets`
- `sessions`
- `student_details`
- `users_demo`

Data access for these tables must use explicit WHERE clauses on business columns; no ORM identity map.

## Foreign keys

| Table | Constraint | Column | References | On update | On delete |
|---|---|---|---|---|---|
| announcements | announcements_user_id_foreign | user_id | users.id | NO ACTION | CASCADE |
| api_tokens | api_tokens_user_id_foreign | user_id | users.id | NO ACTION | CASCADE |
| permission_role | permission_role_permission_id_foreign | permission_id | permissions.id | CASCADE | CASCADE |
| permission_role | permission_role_role_id_foreign | role_id | roles.id | CASCADE | CASCADE |
| replies | replies_ibfk_1 | comment_id | comments.comment_id | NO ACTION | NO ACTION |
| social_logins | social_logins_user_id_foreign | user_id | users.id | NO ACTION | CASCADE |
| user_activity | user_activity_user_id_foreign | user_id | users.id | NO ACTION | CASCADE |
| users | users_country_id_foreign | country_id | countries.id | NO ACTION | SET NULL |
| users | users_role_id_foreign | role_id | roles.id | NO ACTION | NO ACTION |

## Tables

### `announcements`

Engine InnoDB, collation utf8mb4_unicode_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | id | bigint unsigned | NO |  | PRI | auto_increment |
| 2 | user_id | int unsigned | NO |  | MUL |  |
| 3 | title | varchar(191) | NO |  |  |  |
| 4 | body | text | NO |  |  |  |
| 5 | link | longtext | YES |  |  |  |
| 6 | created_at | timestamp | YES |  |  |  |
| 7 | updated_at | timestamp | YES |  |  |  |
| 8 | type | varchar(20) | YES |  |  |  |
| 9 | language | varchar(20) | YES |  |  |  |

Indexes: `announcements_user_id_foreign`(user_id); `PRIMARY`(id) unique

### `api_tokens`

Engine InnoDB, collation utf8mb4_unicode_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | id | varchar(40) | NO |  | PRI |  |
| 2 | user_id | int unsigned | NO |  | MUL |  |
| 3 | ip_address | varchar(45) | YES |  |  |  |
| 4 | user_agent | text | YES |  |  |  |
| 5 | created_at | timestamp | YES |  |  |  |
| 6 | updated_at | timestamp | YES |  |  |  |
| 7 | expires_at | timestamp | YES |  |  |  |

Indexes: `api_tokens_id_expires_at_index`(id, expires_at); `api_tokens_user_id_foreign`(user_id); `PRIMARY`(id) unique

### `articles`

Engine InnoDB, collation utf8mb4_general_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | id | int | NO |  | PRI | auto_increment |
| 2 | title | longtext | YES |  |  |  |
| 3 | description | longtext | YES |  |  |  |
| 4 | status | int | NO | 0 |  |  |

Indexes: `PRIMARY`(id) unique

### `available_professional`

Engine InnoDB, collation utf8mb4_unicode_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | id | bigint unsigned | NO |  | PRI | auto_increment |
| 2 | neat_id | varchar(191) | YES |  |  |  |
| 3 | created_at | timestamp | YES |  |  |  |
| 4 | updated_at | timestamp | YES |  |  |  |
| 5 | total_trainer_regular | varchar(191) | YES |  |  |  |
| 6 | total_trainer_part_time | varchar(191) | YES |  |  |  |
| 7 | no_of_phd_regular | varchar(191) | YES |  |  |  |
| 8 | no_of_phd_part_time | varchar(191) | YES |  |  |  |
| 9 | no_of_ug_pg_regular | varchar(191) | YES |  |  |  |
| 10 | no_of_ug_pg_part_time | varchar(191) | YES |  |  |  |
| 11 | exp_less_five_regular | varchar(191) | YES |  |  |  |
| 12 | exp_less_five_part_time | varchar(191) | YES |  |  |  |
| 13 | exp_more_five_regular | varchar(191) | YES |  |  |  |
| 14 | exp_more_five_part_time | varchar(191) | YES |  |  |  |
| 15 | exp_total_researcher | varchar(191) | YES |  |  |  |
| 16 | exp_total_researcher_phd | varchar(191) | YES |  |  |  |
| 17 | exp_total_researcher_ug_pg | varchar(191) | YES |  |  |  |
| 18 | exp_researcher_less_five | varchar(191) | YES |  |  |  |
| 19 | exp_researcher_more_five | varchar(191) | YES |  |  |  |
| 20 | expert_total | varchar(191) | YES |  |  |  |
| 21 | expert_phd | varchar(191) | YES |  |  |  |
| 22 | expert_ug_pg | varchar(191) | YES |  |  |  |
| 23 | expert_exp_less_five | varchar(191) | YES |  |  |  |
| 24 | expert_exp_more_five | varchar(191) | YES |  |  |  |
| 25 | prof_total | varchar(191) | YES |  |  |  |
| 26 | prof_phd | varchar(191) | YES |  |  |  |
| 27 | prof_ug_pg | varchar(191) | YES |  |  |  |
| 28 | prof_exp_less_five | varchar(191) | YES |  |  |  |
| 29 | prof_exp_more_five | varchar(191) | YES |  |  |  |
| 30 | regular_file_uploaded | varchar(191) | YES |  |  |  |
| 31 | regular_file_name | varchar(191) | YES |  |  |  |
| 32 | regular_file | varchar(191) | YES |  |  |  |
| 33 | part_time_file_uploaded | varchar(191) | YES |  |  |  |
| 34 | part_time_file_name | varchar(191) | YES |  |  |  |
| 35 | part_time_file | varchar(191) | YES |  |  |  |
| 36 | exp_researcher_file_uploaded | varchar(191) | YES |  |  |  |
| 37 | exp_researcher_file_name | varchar(191) | YES |  |  |  |
| 38 | exp_researcher_file | varchar(191) | YES |  |  |  |
| 39 | expert_file_uploaded | varchar(191) | YES |  |  |  |
| 40 | expert_file_name | varchar(191) | YES |  |  |  |
| 41 | expert_file | varchar(191) | YES |  |  |  |
| 42 | prof_file_uploaded | varchar(191) | YES |  |  |  |
| 43 | prof_file_name | varchar(191) | YES |  |  |  |
| 44 | prof_file | varchar(191) | YES |  |  |  |

Indexes: `PRIMARY`(id) unique

### `b2b_enquiry`

Engine InnoDB, collation utf8mb4_general_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | id | int | NO |  | PRI | auto_increment |
| 2 | neat_id | varchar(100) | NO |  |  |  |
| 3 | enquiry_no | varchar(10) | NO |  |  |  |
| 4 | product_code | varchar(100) | NO |  |  |  |
| 5 | product_name | varchar(255) | NO |  |  |  |
| 6 | college_representative_name | varchar(255) | NO |  |  |  |
| 7 | designation | varchar(255) | NO |  |  |  |
| 8 | college_name | varchar(255) | NO |  |  |  |
| 9 | college_email | varchar(255) | NO |  |  |  |
| 10 | no_of_seats | int | NO |  |  |  |
| 11 | mobile_number | varchar(20) | NO |  |  |  |
| 12 | message | longtext | NO |  |  |  |
| 13 | create_date | timestamp | YES | CURRENT_TIMESTAMP |  | DEFAULT_GENERATED |

Indexes: `PRIMARY`(id) unique

### `cart`

Engine InnoDB, collation latin1_swedish_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | id | bigint | NO |  | PRI | auto_increment |
| 2 | application_number | varchar(191) | NO |  | MUL |  |
| 3 | code | varchar(191) | NO |  |  |  |
| 4 | active | varchar(3) | NO | Yes |  |  |
| 5 | created_at | timestamp | NO | CURRENT_TIMESTAMP |  | DEFAULT_GENERATED |
| 6 | updated_at | timestamp | NO | CURRENT_TIMESTAMP |  | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |

Indexes: `application_number`(application_number, code) unique; `PRIMARY`(id) unique

### `comments`

Engine InnoDB, collation latin1_swedish_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | id | int | NO |  | PRI | auto_increment |
| 2 | comment_id | varchar(255) | NO |  | UNI |  |
| 3 | student_id | varchar(255) | NO |  |  |  |
| 4 | course_id | varchar(255) | NO |  |  |  |
| 5 | comment | text | NO |  |  |  |
| 6 | type | varchar(255) | YES |  |  |  |
| 7 | username | varchar(191) | NO |  |  |  |
| 8 | created_at | varchar(50) | NO |  |  |  |
| 9 | replied | varchar(10) | YES | No |  |  |

Indexes: `comment_id`(comment_id) unique; `PRIMARY`(id) unique

### `company`

Engine InnoDB, collation utf8mb4_unicode_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | id | bigint unsigned | NO |  | PRI | auto_increment |
| 2 | neat_id | varchar(191) | YES |  |  |  |
| 3 | name | varchar(191) | YES |  |  |  |
| 4 | country | varchar(191) | YES |  |  |  |
| 5 | date_incorp | varchar(191) | YES |  |  |  |
| 6 | oper_years_india | varchar(191) | YES |  |  |  |
| 7 | address_india | varchar(191) | YES |  |  |  |
| 8 | product_count | int | YES |  |  |  |
| 9 | auth_representative | varchar(191) | YES |  |  |  |
| 10 | auth_representative_name | varchar(191) | YES |  |  |  |
| 11 | auth_representative_address | varchar(191) | YES |  |  |  |
| 12 | auth_representative_tel | varchar(191) | YES |  |  |  |
| 13 | auth_representative_mob | varchar(191) | YES |  |  |  |
| 14 | auth_representative_email | varchar(191) | YES |  |  |  |
| 15 | no_of_emp | varchar(191) | YES |  |  |  |
| 16 | website | varchar(191) | YES |  |  |  |

Indexes: `PRIMARY`(id) unique

### `company_details`

Engine InnoDB, collation utf8mb4_unicode_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | id | bigint unsigned | NO |  | PRI | auto_increment |
| 2 | created_at | timestamp | YES |  |  |  |
| 3 | updated_at | timestamp | YES |  |  |  |
| 4 | neat_id | varchar(191) | YES |  |  |  |
| 5 | name | varchar(191) | YES |  |  |  |
| 6 | country | varchar(191) | YES |  |  |  |
| 7 | date_incorp | varchar(191) | YES |  |  |  |
| 8 | oper_years_india | varchar(191) | YES |  |  |  |
| 9 | address_india | varchar(191) | YES |  |  |  |
| 10 | auth_representative | varchar(191) | YES |  |  |  |
| 11 | auth_representative_name | varchar(191) | YES |  |  |  |
| 12 | auth_representative_address | varchar(191) | YES |  |  |  |
| 13 | auth_representative_tel | varchar(191) | YES |  |  |  |
| 14 | auth_representative_mob | varchar(191) | YES |  |  |  |
| 15 | auth_representative_email | varchar(191) | YES |  |  |  |
| 16 | no_of_emp | varchar(191) | YES |  |  |  |
| 17 | website | varchar(191) | YES |  |  |  |
| 18 | incorp_proof_file_uploaded | varchar(191) | YES |  |  |  |
| 19 | incorp_proof_file_name | varchar(191) | YES |  |  |  |
| 20 | incorp_proof_file | varchar(191) | YES |  |  |  |
| 21 | dipp_file_uploaded | varchar(191) | YES |  |  |  |
| 22 | dipp_file_name | varchar(191) | YES |  |  |  |
| 23 | dipp_file | varchar(191) | YES |  |  |  |
| 24 | dipp_registered | varchar(10) | YES |  |  |  |
| 25 | mou_file_uploaded | varchar(191) | NO | None |  |  |
| 26 | mou_file_name | varchar(191) | NO | None |  |  |
| 27 | mou_file | varchar(191) | NO | None |  |  |
| 28 | mou_date | varchar(100) | NO |  |  |  |

Indexes: `PRIMARY`(id) unique

### `contact_us`

Engine InnoDB, collation utf8mb4_general_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | id | int | NO |  | PRI | auto_increment |
| 2 | name | varchar(255) | NO |  |  |  |
| 3 | email | varchar(255) | NO |  |  |  |
| 4 | message | longtext | NO |  |  |  |

Indexes: `PRIMARY`(id) unique

### `countries`

Engine InnoDB, collation utf8mb4_unicode_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | id | int unsigned | NO |  | PRI | auto_increment |
| 2 | capital | varchar(255) | YES |  |  |  |
| 3 | citizenship | varchar(255) | YES |  |  |  |
| 4 | country_code | varchar(3) | NO |  |  |  |
| 5 | currency | varchar(255) | YES |  |  |  |
| 6 | currency_code | varchar(255) | YES |  |  |  |
| 7 | currency_sub_unit | varchar(255) | YES |  |  |  |
| 8 | currency_symbol | varchar(3) | YES |  |  |  |
| 9 | full_name | varchar(255) | YES |  |  |  |
| 10 | iso_3166_2 | varchar(2) | NO |  |  |  |
| 11 | iso_3166_3 | varchar(3) | NO |  |  |  |
| 12 | name | varchar(255) | NO |  |  |  |
| 13 | region_code | varchar(3) | NO |  |  |  |
| 14 | sub_region_code | varchar(3) | NO |  |  |  |
| 15 | eea | tinyint(1) | NO | 0 |  |  |
| 16 | calling_code | varchar(3) | YES |  |  |  |
| 17 | flag | varchar(6) | YES |  |  |  |

Indexes: `PRIMARY`(id) unique

### `faqs`

Engine InnoDB, collation latin1_swedish_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | id | int | NO |  |  |  |
| 2 | title | text | NO |  |  |  |
| 3 | body | text | NO |  |  |  |
| 4 | role | varchar(10) | NO |  |  |  |
| 5 | title_hindi | varchar(191) | NO |  |  |  |
| 6 | body_hindi | text | NO |  |  |  |
| 7 | role_hindi | varchar(191) | NO |  |  |  |

### `feedback`

Engine InnoDB, collation latin1_swedish_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | id | int | NO |  | PRI | auto_increment |
| 2 | created_at | timestamp | YES | CURRENT_TIMESTAMP |  | DEFAULT_GENERATED |
| 3 | updated_at | timestamp | YES | CURRENT_TIMESTAMP |  | DEFAULT_GENERATED |
| 4 | name | varchar(191) | NO |  |  |  |
| 5 | email | varchar(191) | NO |  |  |  |
| 6 | experience | varchar(191) | NO |  |  |  |
| 7 | feedback | text | NO |  |  |  |
| 8 | user_id | varchar(191) | NO |  |  |  |
| 9 | application_number | varchar(30) | NO |  |  |  |
| 10 | feedback_id | varchar(50) | YES | None | UNI |  |

Indexes: `feedback_id`(feedback_id) unique; `PRIMARY`(id) unique

### `free_seat_audit`

Engine InnoDB, collation latin1_swedish_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | id | bigint | NO |  | PRI | auto_increment |
| 2 | company_secret_code | varchar(191) | NO |  |  |  |
| 3 | application_number | varchar(191) | NO |  |  |  |
| 4 | product_id | varchar(191) | YES |  |  |  |
| 5 | created_at | timestamp | NO | CURRENT_TIMESTAMP |  | DEFAULT_GENERATED |
| 6 | updated_at | timestamp | NO | CURRENT_TIMESTAMP |  | DEFAULT_GENERATED |

Indexes: `PRIMARY`(id) unique

### `free_seat_code`

Engine InnoDB, collation latin1_swedish_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | id | bigint | NO |  | PRI | auto_increment |
| 2 | company_code | varchar(191) | NO |  |  |  |
| 3 | product_code | varchar(191) | NO |  |  |  |
| 4 | neat_secret_code | varchar(191) | NO |  |  |  |
| 5 | company_secret_code | varchar(191) | NO |  |  |  |

Indexes: `PRIMARY`(id) unique

### `grievance`

Engine InnoDB, collation latin1_swedish_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | id | int | NO |  | PRI | auto_increment |
| 2 | name | varchar(255) | NO |  |  |  |
| 3 | email | varchar(255) | NO |  |  |  |
| 4 | mobile | varchar(255) | NO |  |  |  |
| 5 | organization | varchar(255) | YES |  |  |  |
| 6 | description | text | YES |  |  |  |
| 7 | application_number | varchar(255) | YES |  |  |  |
| 8 | user_id | varchar(255) | YES |  |  |  |
| 9 | user_email | varchar(255) | YES |  |  |  |
| 10 | role_id | varchar(255) | YES |  |  |  |
| 11 | grievance_id | varchar(191) | NO |  | UNI |  |

Indexes: `grievance_id`(grievance_id) unique; `PRIMARY`(id) unique

### `institute`

Engine InnoDB, collation latin1_swedish_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | Permanent Institute Id | varchar(191) | YES |  |  |  |
| 2 | Application Number | varchar(191) | YES |  |  |  |
| 3 | Institute Name | varchar(191) | YES |  |  |  |
| 4 | Region | varchar(191) | YES |  |  |  |
| 5 | State | varchar(191) | YES |  |  |  |
| 6 | District | varchar(191) | YES |  |  |  |
| 7 | City | varchar(191) | YES |  |  |  |
| 8 | Address | varchar(191) | YES |  |  |  |
| 9 | Pincode | varchar(191) | YES |  |  |  |
| 10 | Location | varchar(50) | NO |  |  |  |
| 11 | Year | int | YES |  |  |  |
| 12 | Northern Hilly | varchar(10) | YES |  |  |  |
| 13 | Institute Email | varchar(150) | YES |  |  |  |
| 14 | HOI CELL NO | int | YES |  |  |  |
| 15 | HOI EMAIL_ID | varchar(150) | YES |  |  |  |
| 16 | ContactEmail ID | varchar(150) | YES |  |  |  |
| 17 | ContactMobile Number | int | YES |  |  |  |
| 18 | Institution Type | varchar(20) | YES |  |  |  |

### `institute_details`

Engine InnoDB, collation latin1_swedish_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | application_number | varchar(191) | YES | None | UNI |  |
| 2 | institute_name | varchar(191) | YES |  |  |  |
| 3 | institute_aishe_code | varchar(191) | YES |  |  |  |
| 4 | institute_email | varchar(191) | YES |  |  |  |
| 5 | institute_address | varchar(191) | YES |  |  |  |
| 6 | institute_state | varchar(191) | YES |  |  |  |
| 7 | institute_contact_person_name | varchar(191) | YES |  |  |  |
| 8 | institute_neat_coordinator | varchar(191) | YES |  |  |  |
| 9 | institute_mobile | varchar(191) | YES |  |  |  |
| 10 | institute_landline | varchar(191) | YES |  |  |  |
| 11 | id | int | NO |  | PRI | auto_increment |
| 12 | permanent_institute_id | varchar(191) | NO |  | UNI |  |
| 13 | institute_students_number | varchar(191) | NO |  |  |  |
| 14 | institute_contact_person_email | varchar(191) | NO |  |  |  |

Indexes: `application_number`(application_number) unique; `permanent_institute_id`(permanent_institute_id) unique; `PRIMARY`(id) unique

### `learner`

Engine InnoDB, collation latin1_swedish_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | name | varchar(191) | NO |  |  |  |
| 2 | date_of_birth | varchar(191) | YES |  |  |  |
| 3 | phone | varchar(10) | NO |  |  |  |
| 4 | gender | varchar(191) | YES |  |  |  |
| 5 | age | int | YES |  |  |  |
| 6 | profession | varchar(191) | NO |  |  |  |
| 7 | email | varchar(191) | NO |  |  |  |
| 8 | isDetailsSubmitted | varchar(3) | NO | No |  |  |
| 9 | application_number | varchar(191) | NO |  |  |  |
| 10 | updated_at | timestamp | NO | CURRENT_TIMESTAMP |  | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |

### `management_competence`

Engine InnoDB, collation utf8mb4_unicode_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | id | bigint unsigned | NO |  | PRI | auto_increment |
| 2 | created_at | timestamp | YES |  |  |  |
| 3 | updated_at | timestamp | YES |  |  |  |
| 4 | neat_id | varchar(191) | YES |  |  |  |
| 5 | proposed_solution | text | YES |  |  |  |
| 6 | free_coupons | text | YES |  |  |  |
| 7 | complaints | text | YES |  |  |  |
| 8 | standard_policies | text | YES |  |  |  |
| 9 | methodology | text | YES |  |  |  |
| 10 | standard_policies_file_uploaded | varchar(191) | YES |  |  |  |
| 11 | standard_policies_file_name | varchar(191) | YES |  |  |  |
| 12 | standard_policies_file | varchar(191) | YES |  |  |  |
| 13 | methodology_file_uploaded | varchar(191) | YES |  |  |  |
| 14 | methodology_file_name | varchar(191) | YES |  |  |  |
| 15 | methodology_file | varchar(191) | YES |  |  |  |
| 16 | identify_learner_needs | text | YES |  |  |  |
| 17 | artificial_intelligence | text | YES |  |  |  |
| 18 | prod_value_add | text | YES |  |  |  |
| 19 | prod_accredited | text | YES |  |  |  |
| 20 | prod_affiliation | text | YES |  |  |  |
| 21 | prod_accredited_file_uploaded | varchar(191) | YES |  |  |  |
| 22 | prod_accredited_file_name | varchar(191) | YES |  |  |  |
| 23 | prod_accredited_file | varchar(191) | YES |  |  |  |
| 24 | prod_affiliation_file_uploaded | varchar(191) | YES |  |  |  |
| 25 | prod_affiliation_file_name | varchar(191) | YES |  |  |  |
| 26 | prod_affiliation_file | varchar(191) | YES |  |  |  |

Indexes: `PRIMARY`(id) unique

### `migrations`

Engine InnoDB, collation utf8mb4_unicode_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | id | int unsigned | NO |  | PRI | auto_increment |
| 2 | migration | varchar(191) | NO |  |  |  |
| 3 | batch | int | NO |  |  |  |

Indexes: `PRIMARY`(id) unique

### `neat_eoi`

Engine InnoDB, collation utf8mb4_general_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | id | int | NO |  | PRI | auto_increment |
| 2 | neat_id | varchar(25) | NO |  |  |  |
| 3 | email | varchar(100) | NO |  |  |  |
| 4 | company | varchar(255) | NO |  |  |  |
| 5 | phone | varchar(15) | NO |  |  |  |
| 6 | status | int | YES | 0 |  |  |
| 7 | login_status | int | NO | 0 |  |  |
| 8 | created_at | timestamp | NO | CURRENT_TIMESTAMP |  | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |

Indexes: `PRIMARY`(id) unique

### `password_resets`

Engine InnoDB, collation utf8mb4_unicode_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | email | varchar(191) | NO |  | MUL |  |
| 2 | token | varchar(191) | NO |  |  |  |
| 3 | created_at | timestamp | YES |  |  |  |

Indexes: `password_resets_email_index`(email)

### `permission_role`

Engine InnoDB, collation utf8mb4_unicode_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | permission_id | int unsigned | NO |  | PRI |  |
| 2 | role_id | int unsigned | NO |  | PRI |  |

Indexes: `permission_role_role_id_foreign`(role_id); `PRIMARY`(permission_id, role_id) unique

### `permissions`

Engine InnoDB, collation utf8mb4_unicode_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | id | int unsigned | NO |  | PRI | auto_increment |
| 2 | name | varchar(191) | NO |  | UNI |  |
| 3 | display_name | varchar(191) | YES |  |  |  |
| 4 | description | varchar(191) | YES |  |  |  |
| 5 | removable | tinyint(1) | NO | 1 |  |  |
| 6 | created_at | timestamp | YES |  |  |  |
| 7 | updated_at | timestamp | YES |  |  |  |

Indexes: `permissions_name_unique`(name) unique; `PRIMARY`(id) unique

### `product`

Engine InnoDB, collation utf8mb4_unicode_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | id | bigint unsigned | NO |  | PRI | auto_increment |
| 2 | created_at | timestamp | YES |  |  |  |
| 3 | updated_at | timestamp | YES |  |  |  |
| 4 | neat_id | varchar(191) | YES |  |  |  |
| 5 | code | varchar(191) | YES |  |  |  |
| 6 | name | varchar(191) | YES |  |  |  |
| 7 | youtube_link | varchar(191) | YES |  |  |  |
| 8 | trial_sol_link | varchar(191) | YES |  |  |  |
| 9 | product_technology | varchar(191) | YES |  |  |  |
| 10 | product_active | varchar(3) | YES | Yes |  |  |
| 11 | email | varchar(191) | YES | None |  |  |

Indexes: `PRIMARY`(id) unique

### `product_details`

Engine InnoDB, collation latin1_swedish_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | id | int unsigned | NO |  | PRI | auto_increment |
| 2 | created_at | timestamp | YES |  |  |  |
| 3 | updated_at | timestamp | YES |  |  |  |
| 4 | neat_id | varchar(20) | YES |  |  |  |
| 5 | code | varchar(191) | YES |  | UNI |  |
| 6 | application_number | varchar(191) | NO |  |  |  |
| 7 | company_name | varchar(191) | YES |  |  |  |
| 8 | product_type | varchar(191) | YES |  |  |  |
| 9 | product_highlights | text | YES |  |  |  |
| 10 | product_category | text | YES |  |  |  |
| 11 | product_bucket | varchar(255) | YES |  |  |  |
| 12 | pre_requisites | text | YES |  |  |  |
| 13 | course_deliverables | text | YES |  |  |  |
| 14 | price | text | YES |  |  |  |
| 15 | faqs | text | YES |  |  |  |
| 16 | refund_policy | text | YES |  |  |  |
| 17 | additional_cost | text | YES |  |  |  |
| 18 | course_duration | text | YES |  |  |  |
| 19 | minimum_batch | text | YES |  |  |  |
| 20 | course_start_date | text | YES |  |  |  |
| 21 | course_end_date | text | YES |  |  |  |
| 22 | interactive_session | text | YES |  |  |  |
| 23 | examination_dates | text | YES |  |  |  |
| 24 | terms_conditions | text | YES |  |  |  |
| 25 | payment_link | varchar(191) | NO |  |  |  |
| 26 | providedFreeCourses | int | NO | 300 |  |  |
| 27 | registeredFreeCourses | int | NO | 0 |  |  |
| 28 | availableFreeCourses | int | NO | 300 |  |  |
| 29 | product_active | varchar(10) | NO | Yes |  |  |
| 30 | isDetailsSubmitted | varchar(3) | NO | No |  |  |
| 31 | product_video_uploaded | varchar(191) | YES | No |  |  |
| 32 | product_video_name | varchar(191) | YES | None |  |  |
| 33 | product_video_file | varchar(191) | YES | None |  |  |
| 34 | course_logo_uploaded | varchar(191) | YES | No |  |  |
| 35 | course_logo_name | varchar(191) | YES | None |  |  |
| 36 | course_logo_file | varchar(191) | YES | None |  |  |
| 37 | product_direct_url | longtext | YES |  |  |  |
| 38 | b2b_discount_table_uploaded | varchar(10) | YES |  |  |  |
| 39 | b2b_discount_table_name | varchar(255) | YES |  |  |  |
| 40 | b2b_discount_table_file | varchar(255) | YES |  |  |  |
| 41 | course_name | varchar(191) | YES | None |  |  |
| 42 | short_description | text | YES |  |  |  |
| 43 | short_description_sidebar | text | YES |  |  |  |
| 44 | requirements_heading | text | YES |  |  |  |
| 45 | requirements_description | text | YES |  |  |  |
| 46 | description_heading | text | YES |  |  |  |
| 47 | description | text | YES |  |  |  |
| 48 | keywords | varchar(191) | YES |  |  |  |
| 49 | stream | varchar(191) | YES |  |  |  |
| 50 | avg_likert_rating | varchar(50) | YES |  |  |  |
| 51 | neat_course_id | varchar(50) | YES | None |  |  |
| 52 | mou_signed_status | tinyint | NO | 0 |  |  |
| 53 | view_counter | int | NO |  |  |  |

Indexes: `code`(code) unique; `PRIMARY`(id) unique

### `product_details_awards_received`

Engine InnoDB, collation utf8mb3_general_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | id | bigint unsigned | NO |  | PRI | auto_increment |
| 2 | created_at | timestamp | YES |  |  |  |
| 3 | updated_at | timestamp | YES |  |  |  |
| 4 | neat_id | varchar(191) | YES |  |  |  |
| 5 | code | varchar(191) | YES |  |  |  |
| 6 | award_name_national | varchar(191) | YES |  |  |  |
| 7 | award_name_international | varchar(191) | YES |  |  |  |
| 8 | award_received_country | varchar(191) | YES |  |  |  |
| 9 | is_details_updated | varchar(191) | NO | No |  |  |
| 10 | product_active | varchar(3) | YES | Yes |  |  |

Indexes: `PRIMARY`(id) unique

### `product_details_company_experience`

Engine InnoDB, collation utf8mb4_unicode_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | id | bigint unsigned | NO |  | PRI | auto_increment |
| 2 | created_at | timestamp | YES |  |  |  |
| 3 | updated_at | timestamp | YES |  |  |  |
| 4 | neat_id | varchar(191) | YES |  |  |  |
| 5 | code | varchar(191) | YES |  |  |  |
| 6 | product_suitable_for | varchar(191) | YES |  |  |  |
| 7 | proposed_fee_struc | varchar(191) | YES |  |  |  |
| 8 | proposed_pricing | varchar(191) | YES |  |  |  |
| 9 | launch_year | varchar(191) | YES |  |  |  |
| 10 | launch_year_india | varchar(191) | YES |  |  |  |
| 11 | learner_registered | varchar(191) | YES |  |  |  |
| 12 | avg_likert_rating | varchar(191) | YES |  |  |  |
| 13 | registered_india | varchar(191) | YES |  |  |  |
| 14 | learner_completed_india | varchar(191) | YES |  |  |  |
| 15 | is_details_updated | varchar(191) | NO | No |  |  |
| 16 | product_active | varchar(3) | YES | Yes |  |  |

Indexes: `PRIMARY`(id) unique

### `product_details_feature_description`

Engine InnoDB, collation utf8mb4_unicode_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | id | bigint unsigned | NO |  | PRI | auto_increment |
| 2 | created_at | timestamp | YES |  |  |  |
| 3 | updated_at | timestamp | YES |  |  |  |
| 4 | neat_id | varchar(191) | YES |  |  |  |
| 5 | code | varchar(191) | YES |  |  |  |
| 6 | target_audience | varchar(191) | YES |  |  |  |
| 7 | sol_type | varchar(191) | YES |  |  |  |
| 8 | sol_outcome | text | YES |  |  |  |
| 9 | sol_input | text | YES |  |  |  |
| 10 | sol_learning_features | text | YES |  |  |  |
| 11 | sol_interface | varchar(191) | YES |  |  |  |
| 12 | overall_features | text | YES |  |  |  |
| 13 | sol_implemented_countries | text | YES |  |  |  |
| 14 | is_details_updated | varchar(191) | NO | No |  |  |
| 15 | othersTargetAudiance | varchar(191) | YES |  |  |  |
| 16 | product_active | varchar(3) | YES | Yes |  |  |

Indexes: `PRIMARY`(id) unique

### `product_details_technical_details`

Engine InnoDB, collation utf8mb4_unicode_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | id | bigint unsigned | NO |  | PRI | auto_increment |
| 2 | created_at | timestamp | YES |  |  |  |
| 3 | updated_at | timestamp | YES |  |  |  |
| 4 | neat_id | varchar(191) | YES |  |  |  |
| 5 | code | varchar(191) | YES |  |  |  |
| 6 | tech_used | text | YES |  |  |  |
| 7 | quality_standard | text | YES |  |  |  |
| 8 | req_trained_faculties | text | YES |  |  |  |
| 9 | min_infra | text | YES |  |  |  |
| 10 | annual_purchase_required | text | YES |  |  |  |
| 11 | mnc_required | varchar(5) | YES |  |  |  |
| 12 | mnc_amount | varchar(191) | YES |  |  |  |
| 13 | completion_duration | text | YES |  |  |  |
| 14 | is_details_updated | varchar(191) | NO | No |  |  |
| 15 | product_active | varchar(3) | YES | Yes |  |  |

Indexes: `PRIMARY`(id) unique

### `product_files`

Engine InnoDB, collation utf8mb4_unicode_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | id | bigint unsigned | NO |  | PRI | auto_increment |
| 2 | created_at | timestamp | YES |  |  |  |
| 3 | updated_at | timestamp | YES |  |  |  |
| 4 | neat_id | varchar(191) | YES |  |  |  |
| 5 | clients_file_uploaded | varchar(191) | YES |  |  |  |
| 6 | clients_file_name | varchar(191) | YES |  |  |  |
| 7 | clients_file | varchar(191) | YES |  |  |  |
| 8 | learner_file_uploaded | varchar(191) | YES |  |  |  |
| 9 | learner_file_name | varchar(191) | YES |  |  |  |
| 10 | learner_file | varchar(191) | YES |  |  |  |
| 11 | registered_learner_file_uploaded | varchar(191) | YES |  |  |  |
| 12 | registered_learner_file_name | varchar(191) | YES |  |  |  |
| 13 | registered_learner_file | varchar(191) | YES |  |  |  |
| 14 | likert_file_uploaded | varchar(191) | YES |  |  |  |
| 15 | likert_file_name | varchar(191) | YES |  |  |  |
| 16 | likert_file | varchar(191) | YES |  |  |  |

Indexes: `PRIMARY`(id) unique

### `product_payment_gateway_url`

Engine InnoDB, collation latin1_swedish_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | id | int | NO |  | PRI | auto_increment |
| 2 | company_id | varchar(191) | NO |  |  |  |
| 3 | product_id | varchar(191) | NO |  |  |  |
| 4 | neat_product_url | varchar(191) | NO |  |  |  |
| 5 | company_gateway_url | varchar(191) | NO |  |  |  |
| 6 | neat_payment_success | varchar(191) | NO |  |  |  |
| 7 | neat_payment_failure | varchar(191) | NO |  |  |  |
| 8 | company_payment_success | varchar(191) | NO |  |  |  |
| 9 | company_payment_failure | varchar(191) | NO |  |  |  |
| 10 | active | tinyint(1) | NO | 0 |  |  |

Indexes: `PRIMARY`(id) unique

### `product_purchased_audit`

Engine InnoDB, collation latin1_swedish_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | id | bigint unsigned | NO |  | PRI | auto_increment |
| 2 | created_at | timestamp | YES | CURRENT_TIMESTAMP |  | DEFAULT_GENERATED |
| 3 | updated_at | timestamp | YES |  |  | on update CURRENT_TIMESTAMP |
| 4 | application_number | varchar(191) | NO |  |  |  |
| 5 | code | varchar(191) | YES |  | MUL |  |
| 6 | course_type | varchar(10) | NO |  |  |  |
| 7 | transaction_id | varchar(191) | YES |  |  |  |
| 8 | approved_by | varchar(191) | YES | Under Evaluation |  |  |
| 9 | status | varchar(50) | YES | Payment Pending |  |  |
| 10 | sessionid | varchar(191) | NO |  | UNI |  |
| 11 | quantity | int | NO | 1 |  |  |

Indexes: `code`(code, application_number) unique; `PRIMARY`(id) unique; `sessionid`(sessionid) unique

### `replies`

Engine InnoDB, collation latin1_swedish_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | id | int | NO |  | PRI | auto_increment |
| 2 | reply | varchar(255) | NO |  |  |  |
| 3 | comment_id | varchar(255) | NO |  | MUL |  |
| 4 | username | varchar(255) | NO |  |  |  |
| 5 | created_at | varchar(50) | NO |  |  |  |

Indexes: `comment_id`(comment_id); `PRIMARY`(id) unique

### `roles`

Engine InnoDB, collation utf8mb4_unicode_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | id | int unsigned | NO |  | PRI | auto_increment |
| 2 | name | varchar(191) | NO |  | UNI |  |
| 3 | display_name | varchar(191) | YES |  |  |  |
| 4 | description | varchar(191) | YES |  |  |  |
| 5 | removable | tinyint(1) | NO | 1 |  |  |
| 6 | created_at | timestamp | YES |  |  |  |
| 7 | updated_at | timestamp | YES |  |  |  |

Indexes: `PRIMARY`(id) unique; `roles_name_unique`(name) unique

### `sessions`

Engine InnoDB, collation utf8mb4_unicode_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | id | varchar(191) | NO |  | PRI |  |
| 2 | user_id | int | YES |  |  |  |
| 3 | ip_address | varchar(45) | YES |  |  |  |
| 4 | user_agent | text | YES |  |  |  |
| 5 | payload | text | NO |  |  |  |
| 6 | last_activity | int | NO |  |  |  |

Indexes: `sessions_id_unique`(id) unique

### `settings`

Engine InnoDB, collation utf8mb4_unicode_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | id | int unsigned | NO |  | PRI | auto_increment |
| 2 | key | varchar(191) | NO |  | MUL |  |
| 3 | value | text | NO |  |  |  |

Indexes: `PRIMARY`(id) unique; `settings_key_index`(key)

### `sms_details`

Engine InnoDB, collation latin1_swedish_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | id | int | NO |  | PRI | auto_increment |
| 2 | user | varchar(191) | YES |  |  |  |
| 3 | phone | varchar(15) | YES |  |  |  |
| 4 | content | varchar(191) | YES |  |  |  |

Indexes: `PRIMARY`(id) unique

### `social_logins`

Engine InnoDB, collation utf8mb4_unicode_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | id | int unsigned | NO |  | PRI | auto_increment |
| 2 | user_id | int unsigned | NO |  | MUL |  |
| 3 | provider | varchar(50) | NO |  |  |  |
| 4 | provider_id | varchar(191) | NO |  |  |  |
| 5 | avatar | varchar(191) | NO |  |  |  |
| 6 | created_at | timestamp | NO | CURRENT_TIMESTAMP |  | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |

Indexes: `PRIMARY`(id) unique; `social_logins_user_id_foreign`(user_id)

### `student`

Engine InnoDB, collation latin1_swedish_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | id | int | NO |  | PRI | auto_increment |
| 2 | application_number | varchar(191) | NO |  | UNI |  |
| 3 | name | varchar(255) | NO |  |  |  |
| 4 | father_name | varchar(255) | NO | None |  |  |
| 5 | mobile | varchar(255) | NO |  | UNI |  |
| 6 | email | varchar(255) | NO |  | MUL |  |
| 7 | birthdate | varchar(255) | NO |  |  |  |
| 8 | admission_registration_number | varchar(255) | NO |  |  |  |
| 9 | category | varchar(255) | NO |  |  |  |
| 10 | gender | varchar(255) | NO |  |  |  |
| 11 | year_of_admission | varchar(255) | NO |  |  |  |
| 12 | program | varchar(191) | NO | None |  |  |
| 13 | permanent_institute_id | varchar(191) | YES |  |  |  |
| 14 | isEligibleFreeCourse | tinyint(1) | YES | 0 |  |  |
| 15 | department_stream | varchar(191) | YES |  |  |  |
| 16 | institute_name | varchar(191) | NO |  |  |  |
| 17 | state | varchar(191) | NO |  |  |  |
| 18 | aicte_code | varchar(191) | NO |  |  |  |
| 19 | preference_1 | varchar(191) | YES |  |  |  |
| 20 | preference_2 | varchar(191) | YES |  |  |  |
| 21 | preference_3 | varchar(191) | YES |  |  |  |
| 22 | marks_hsc | varchar(191) | YES |  |  |  |
| 23 | total_marks | varchar(191) | YES |  |  |  |
| 24 | percentage | varchar(191) | YES |  |  |  |
| 25 | course_name | varchar(191) | YES |  |  |  |
| 26 | is_rule_engine_processed | tinyint(1) | YES | 0 |  |  |

Indexes: `application_number`(application_number) unique; `email`(email, mobile) unique; `email_2`(email, mobile) unique; `email_3`(email) unique; `mobile`(mobile) unique; `PRIMARY`(id) unique

### `student_details`

Engine InnoDB, collation latin1_swedish_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | id | bigint unsigned | NO |  | PRI | auto_increment |
| 2 | application_number | varchar(191) | NO |  | UNI |  |
| 3 | created_at | timestamp | YES | CURRENT_TIMESTAMP |  | DEFAULT_GENERATED |
| 4 | updated_at | timestamp | YES |  |  |  |
| 5 | name_of_learner | varchar(191) | NO |  |  |  |
| 6 | father_name | varchar(50) | YES |  |  |  |
| 7 | date_of_birth | varchar(50) | YES |  |  |  |
| 8 | residential_address | varchar(191) | YES |  |  |  |
| 9 | state | varchar(50) | YES |  |  |  |
| 10 | category | varchar(50) | YES |  |  |  |
| 11 | gender | varchar(10) | YES |  |  |  |
| 12 | religion | varchar(50) | YES | None |  |  |
| 13 | college_name | varchar(191) | NO |  |  |  |
| 14 | year_of_admission | varchar(10) | YES |  |  |  |
| 15 | identity_number | varchar(50) | YES |  |  |  |
| 16 | admission_registration_number | varchar(50) | YES |  |  |  |
| 17 | stream_of_education | varchar(50) | YES |  |  |  |
| 18 | academic_record | varchar(191) | YES |  |  |  |
| 19 | contact_number | varchar(10) | NO |  | UNI |  |
| 20 | email | varchar(191) | NO |  | UNI |  |
| 21 | profession | varchar(191) | YES |  |  |  |
| 22 | isDetailsSubmitted | varchar(3) | NO | No |  |  |
| 23 | freeCoursesCount | int | NO | 0 |  |  |
| 24 | college_state | varchar(30) | YES | None |  |  |

Indexes: `application_number`(application_number) unique; `contact_number`(contact_number) unique; `email`(email) unique; `id`(id) unique

### `student_free_seat_allocations`

Engine InnoDB, collation utf8mb4_general_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | id | int | NO |  | PRI | auto_increment |
| 2 | admission_registration_number | varchar(100) | NO |  |  |  |
| 3 | student_email | varchar(255) | NO |  |  |  |
| 4 | student_id | varchar(50) | YES | None |  |  |
| 5 | course_id | varchar(50) | YES | None |  |  |
| 6 | stream_id | varchar(50) | YES | None |  |  |
| 7 | permanent_institute_id | varchar(100) | YES | None |  |  |
| 8 | isEligibleFreeCourse | int | NO | 0 |  |  |
| 9 | deleted_at | timestamp | YES |  |  |  |
| 10 | created_at | timestamp | YES |  |  |  |
| 11 | updated_at | timestamp | YES |  |  |  |
| 12 | neat_secret_code | varchar(100) | YES | None |  |  |
| 13 | student_secret_code | varchar(100) | YES | None |  |  |
| 14 | company_secret_code | varchar(191) | YES | None |  |  |
| 15 | is_course_availed | varchar(3) | YES | No |  |  |

Indexes: `PRIMARY`(id) unique

### `temp_student`

Engine InnoDB, collation utf8mb3_general_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | id | int | NO |  | PRI | auto_increment |
| 2 | name | varchar(255) | YES |  |  |  |
| 3 | father_name | varchar(255) | YES |  |  |  |
| 4 | institute_name | varchar(255) | YES |  |  |  |
| 5 | mobile | varchar(10) | YES |  |  |  |
| 6 | email | varchar(255) | YES |  |  |  |
| 7 | birthdate | varchar(100) | YES |  |  |  |
| 8 | admission_registration_number | varchar(100) | YES |  |  |  |
| 9 | course_name | varchar(100) | YES |  |  |  |
| 10 | program | varchar(100) | YES |  |  |  |
| 11 | stream | varchar(10) | YES |  |  |  |
| 12 | percentage | float | NO |  |  |  |
| 13 | category_id | int | YES |  |  |  |
| 14 | gender | varchar(20) | YES |  |  |  |
| 15 | year_of_admission | varchar(10) | YES |  |  |  |
| 16 | permanent_institute_id | varchar(255) | YES |  |  |  |
| 17 | isEligibleFreeCourse | varchar(10) | YES |  |  |  |
| 18 | institute_id | int | YES |  |  |  |

Indexes: `PRIMARY`(id) unique

### `transaction_id`

Engine InnoDB, collation latin1_swedish_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | id | int | NO |  | PRI | auto_increment |
| 2 | created_at | timestamp | NO | CURRENT_TIMESTAMP |  | DEFAULT_GENERATED |
| 3 | application_number | varchar(20) | NO |  | MUL |  |
| 4 | code | varchar(20) | NO |  |  |  |
| 5 | transaction_id | varchar(191) | NO |  | UNI |  |

Indexes: `application_number`(application_number, code) unique; `PRIMARY`(id) unique; `transaction_id`(transaction_id) unique

### `user_activity`

Engine InnoDB, collation utf8mb4_unicode_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | id | int unsigned | NO |  | PRI | auto_increment |
| 2 | description | text | NO |  |  |  |
| 3 | user_id | int unsigned | NO |  | MUL |  |
| 4 | ip_address | varchar(45) | NO |  |  |  |
| 5 | user_agent | text | NO |  |  |  |
| 6 | created_at | timestamp | NO | CURRENT_TIMESTAMP |  | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |

Indexes: `PRIMARY`(id) unique; `user_activity_user_id_foreign`(user_id)

### `users`

Engine InnoDB, collation utf8mb4_unicode_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | id | int unsigned | NO |  | PRI | auto_increment |
| 2 | application_number | varchar(191) | YES |  | UNI |  |
| 3 | permanent_institute_id | varchar(191) | YES |  |  |  |
| 4 | email | varchar(191) | NO |  | UNI |  |
| 5 | username | varchar(191) | YES |  | MUL |  |
| 6 | password | varchar(191) | NO |  |  |  |
| 7 | first_name | varchar(191) | YES |  | UNI |  |
| 8 | last_name | varchar(191) | YES |  |  |  |
| 9 | phone | varchar(191) | YES |  |  |  |
| 10 | avatar | varchar(191) | YES |  |  |  |
| 11 | address | varchar(191) | YES |  |  |  |
| 12 | country_id | int unsigned | YES |  | MUL |  |
| 13 | role_id | int unsigned | NO |  | MUL |  |
| 14 | birthday | date | YES |  |  |  |
| 15 | last_login | timestamp | YES |  |  |  |
| 16 | status | varchar(20) | NO |  | MUL |  |
| 17 | two_factor_country_code | int | YES |  |  |  |
| 18 | two_factor_phone | int | YES |  |  |  |
| 19 | two_factor_options | text | YES |  |  |  |
| 20 | email_verified_at | timestamp | YES |  |  |  |
| 21 | remember_token | varchar(100) | YES |  |  |  |
| 22 | created_at | timestamp | YES |  | MUL |  |
| 23 | updated_at | timestamp | YES |  |  |  |
| 24 | announcements_last_read_at | timestamp | YES |  |  |  |
| 25 | unique_uuid | varchar(191) | NO | None |  |  |
| 26 | sms_otp | varchar(100) | YES | None |  |  |
| 27 | sms_otp_verified | varchar(100) | YES | No |  |  |
| 28 | email_verification_token | varchar(100) | YES |  |  |  |

Indexes: `application_number`(first_name) unique; `application_number_2`(application_number) unique; `PRIMARY`(id) unique; `users_country_id_foreign`(country_id); `users_created_at_index`(created_at); `users_email_unique`(email) unique; `users_role_id_foreign`(role_id); `users_status_index`(status); `users_username_index`(username)

### `users_demo`

Engine InnoDB, collation latin1_swedish_ci

| # | Column | Type | Null | Default | Key | Extra |
|---|---|---|---|---|---|---|
| 1 | id | bigint unsigned | NO |  |  |  |
| 2 | neat_id | varchar(191) | YES |  |  |  |
| 3 | name | varchar(191) | NO |  |  |  |
| 4 | email | varchar(191) | NO |  |  |  |
| 5 | email_verified_at | timestamp | YES |  |  |  |
| 6 | email_verification_token | varchar(300) | YES |  |  |  |
| 7 | password | varchar(191) | NO |  |  |  |
| 8 | isCompanyDetailsSubmitted | varchar(191) | NO | No |  |  |
| 9 | isProductNameSubmitted | varchar(191) | NO | No |  |  |
| 10 | isProductDetailsSubmitted | varchar(191) | NO | No |  |  |
| 11 | isFinancialCompetenceSubmitted | varchar(191) | NO | No |  |  |
| 12 | isAvailableProfSubmitted | varchar(191) | NO | No |  |  |
| 13 | isManagementSubmitted | varchar(191) | NO | No |  |  |
| 14 | application_submitted | varchar(191) | YES |  |  |  |
| 15 | remember_token | varchar(100) | YES |  |  |  |
| 16 | created_at | timestamp | YES |  |  |  |
| 17 | updated_at | timestamp | YES |  |  |  |
| 18 | mobile_number | varchar(10) | YES |  |  |  |
| 19 | assigned_to | varchar(40) | YES | Not Assigned |  |  |
| 20 | type | varchar(20) | YES | company |  |  |
| 21 | status | varchar(20) | YES | None |  |  |
| 22 | round_one_grade | varchar(1) | YES |  |  |  |
| 23 | round_one_top_two_grade | varchar(10) | YES |  |  |  |
