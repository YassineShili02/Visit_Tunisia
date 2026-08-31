import { Destination, FeaturedCard } from './models';

export const DESTINATIONS_DATA: Destination[] = [
  { id:1, name:"Médina de Sidi Bou Saïd", shortName:"Sidi Bou Saïd", region:"Tunis", category:"Culturel", type:"Village historique", estType:"Site touristique", rating:4.8, reviews:2340, price:0, img:"https://images.unsplash.com/photo-1565711561500-49678a10a63f?w=700&h=500&fit=crop&auto=format", mapX:278, mapY:42, latitude: 36.8702, longitude: 10.3472 },
  { id:2, name:"Amphithéâtre d'El Jem", shortName:"El Jem", region:"Mahdia", category:"Culturel", type:"Site archéologique", estType:"Site touristique", rating:4.9, reviews:1890, price:12, img:"https://images.unsplash.com/photo-1744512300329-e7dcca5aca9b?w=700&h=500&fit=crop&auto=format", mapX:312, mapY:147, latitude: 35.2965, longitude: 10.7058 },
  { id:3, name:"Désert de Douz", shortName:"Douz", region:"Kébili", category:"Aventure", type:"Site naturel", estType:"Activité", rating:4.7, reviews:1875, price:35, img:"https://images.unsplash.com/photo-1767936924967-e13feccc8d29?w=700&h=500&fit=crop&auto=format", mapX:148, mapY:270, latitude: 33.4593, longitude: 9.0253 },
  { id:4, name:"Plage de Djerba", shortName:"Djerba", region:"Médenine", category:"Balnéaire", type:"Station balnéaire", estType:"Hébergement", rating:4.6, reviews:3102, price:0, img:"https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=700&h=500&fit=crop&auto=format", mapX:315, mapY:258, latitude: 33.8076, longitude: 10.8451 },
  { id:5, name:"Musée du Bardo", shortName:"Bardo", region:"Tunis", category:"Culturel", type:"Musée national", estType:"Site touristique", rating:4.9, reviews:4210, price:11, img:"https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=700&h=500&fit=crop&auto=format", mapX:255, mapY:50, latitude: 36.8093, longitude: 10.1344 },
  { id:6, name:"Site archéologique de Dougga", shortName:"Dougga", region:"Béja", category:"Culturel", type:"Site archéologique", estType:"Site touristique", rating:4.7, reviews:987, price:8, img:"https://images.unsplash.com/photo-1775129068313-8be80f13f12f?w=700&h=500&fit=crop&auto=format", mapX:168, mapY:72, latitude: 36.4225, longitude: 9.2198 },
];

export const FEATURED_CARDS: FeaturedCard[] = [
  { id:1, name:"Médina de Sidi Bou Saïd", region:"Tunis", type:"Village historique", category:"Culturel", categoryColor:"#1B6FA8", img:"https://images.unsplash.com/photo-1565711561500-49678a10a63f?w=700&h=500&fit=crop&auto=format", rating:4.8, reviews:2340 },
  { id:2, name:"Désert de Douz", region:"Gouvernorat de Kébili", type:"Site naturel", category:"Aventure", categoryColor:"#D97D45", img:"https://images.unsplash.com/photo-1767936924967-e13feccc8d29?w=700&h=500&fit=crop&auto=format", rating:4.7, reviews:1875 },
  { id:3, name:"Plage de Djerba", region:"Médenine", type:"Station balnéaire", category:"Balnéaire", categoryColor:"#7EC8E3", img:"https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=700&h=500&fit=crop&auto=format", rating:4.6, reviews:3102 },
  { id:4, name:"Musée du Bardo", region:"Tunis", type:"Musée national", category:"Culturel", categoryColor:"#6B8E4E", img:"https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=700&h=500&fit=crop&auto=format", rating:4.9, reviews:4210 },
];
