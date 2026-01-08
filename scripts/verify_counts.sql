SELECT 
  facility_profile->>'operator' as operator, 
  count(*) 
FROM nodes 
GROUP BY 1 
ORDER BY 2 DESC;
