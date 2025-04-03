interface GearType {
  id: string;
  name: string;
  company: string;
  weight: string;
  imageUrl: string;
  category?: string;
  subCategory?: string;
  useless: string[];
  used: string[];
  bags: string[];
}

export default GearType;
