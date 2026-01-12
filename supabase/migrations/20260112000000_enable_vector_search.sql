-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Create a table to store expert knowledge pieces
create table if not exists expert_knowledge (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  tags text[] default '{}',
  category text, -- e.g., 'fare', 'safety', 'access'
  embedding vector(1536), -- Compatible with OpenAI/MiniMax small models
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table expert_knowledge enable row level security;

-- Create a policy that allows anyone to read (for public knowledge base)
create policy "Allow public read access"
  on expert_knowledge
  for select
  to public
  using (true);

-- Create a function to search for expert knowledge
create or replace function match_expert_knowledge (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    expert_knowledge.id,
    expert_knowledge.content,
    1 - (expert_knowledge.embedding <=> query_embedding) as similarity
  from expert_knowledge
  where 1 - (expert_knowledge.embedding <=> query_embedding) > match_threshold
  order by expert_knowledge.embedding <=> query_embedding
  limit match_count;
end;
$$;
