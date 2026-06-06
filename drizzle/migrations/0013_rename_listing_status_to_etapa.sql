-- Migration: Rename listingStatus → listingEtapa in listings.data JSON

UPDATE listings
SET data = (data - 'listingStatus') || jsonb_build_object('listingEtapa', data->'listingStatus')
WHERE data ? 'listingStatus';
