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
  nameKorean: string;

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
    nameKorean = '',
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
    nameKorean?: string;
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
    this.nameKorean = nameKorean;
  }
}

export default ManagerGear;
