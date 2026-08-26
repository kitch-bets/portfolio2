# GNV Parking Navigator

A mobile-first Gainesville street-parking navigator that:

- loads City of Gainesville on-street parking GIS data
- uses browser GPS over HTTPS
- ranks eligible parking curb segments near a destination
- builds an outward search route through parking streets
- provides live route guidance through each mapped curb segment

## Deploy on Vercel

Import this GitHub repository into Vercel as a static site. No build command is required. Vercel will serve `index.html` over HTTPS, which enables browser geolocation after the user grants permission.

Posted street signs always control parking legality; City GIS is a planning aid and does not provide live vacancy data.
