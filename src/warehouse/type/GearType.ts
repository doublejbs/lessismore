interface GearType {
  id: string;
  name: string;
  company: string;
  weight: string;
  imageUrl: string;
  category?: string;
  useless: string[];
  used: string[];
  bags: string[];
  createDate: number;
  color: string;
  companyKorean: string;
}

export default GearType;
