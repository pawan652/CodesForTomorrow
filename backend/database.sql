-- Create database if it doesn't exist

create database if not exists chat_app
  character set utf8mb4
  collate utf8mb4_unicode_ci;

use chat_app;

-- Drop tables if they exist
drop table if exists chat_members;
drop table if exists chats;
drop table if exists users;

-- Create users table
create table users (
  id int not null auto_increment,
  name varchar(100) not null,
  email varchar(255) null,
  password_hash varchar(255) null,
  is_online tinyint(1) not null default 0,
  created_at timestamp not null default current_timestamp,
  primary key (id),
  unique key uq_users_email (email)
);

-- Create chats table
create table chats (
  id int not null auto_increment,
  user_low_id int not null,
  user_high_id int not null,
  created_at timestamp not null default current_timestamp,
  primary key (id),
  unique key uq_chat_user_pair (user_low_id, user_high_id),
  constraint chk_chat_user_order check (user_low_id < user_high_id),
  constraint fk_chats_user_low foreign key (user_low_id) references users (id) on delete cascade,
  constraint fk_chats_user_high foreign key (user_high_id) references users (id) on delete cascade
);

-- Create chat_members table
create table chat_members (
  id int not null auto_increment,
  chat_id int not null,
  user_id int not null,
  created_at timestamp not null default current_timestamp,
  primary key (id),
  unique key uq_chat_member (chat_id, user_id),
  key idx_chat_members_user (user_id),
  constraint fk_chat_members_chat foreign key (chat_id) references chats (id) on delete cascade,
  constraint fk_chat_members_user foreign key (user_id) references users (id) on delete cascade
);