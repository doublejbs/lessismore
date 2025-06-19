class ManagerGear {
  id: string;
  name: string;
  company: string;
  companyKorean: string;
  weight: string;
  category: string;
  createDate: number;
  imageUrl: string;
  color?: string;

  constructor({
    id,
    name,
    company,
    companyKorean,
    weight,
    category,
    createDate,
    imageUrl = '',
    color = '',
  }: {
    id: string;
    name: string;
    company: string;
    companyKorean: string;
    weight: string;
    category: string;
    createDate: number;
    imageUrl?: string;
    color?: string;
  }) {
    this.id = id;
    this.name = name;
    this.company = company;
    this.companyKorean = companyKorean;
    this.weight = weight;
    this.category = category;
    this.createDate = createDate;
    this.imageUrl = imageUrl;
    this.color = color;
  }
}

export default ManagerGear;
