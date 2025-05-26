import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Table, Button, Spin, message, Checkbox } from 'antd';
import Manage from './model/Manage';
import GearRow from './GearRow';
import SearchInput from './SearchInput';
import AddGearModal from './component/AddGearModal';
import AddGearExcelModal from './component/AddGearExcelModal';
interface RowType {
  id: string;
  name: string;
  company: string;
  companyKorean: string;
  weight: string;
  category: string;
  subCategory: string;
  createDate: number;
  imageUrl?: string;
  color?: string;
}

const ManageView = () => {
  const [manage] = useState(() => Manage.new());
  const [editRowId, setEditRowId] = useState<string | null>(null);
  const [editRowValues, setEditRowValues] = useState<Partial<RowType>>({});
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const loaderRef = React.useRef<HTMLDivElement | null>(null);
  const tableBodyRef = React.useRef<HTMLTableSectionElement | null>(null);
  const nameInputRef = useRef<any>(null);
  const companyInputRef = useRef<any>(null);
  const companyKoreanInputRef = useRef<any>(null);
  const weightInputRef = useRef<any>(null);
  const categoryInputRef = useRef<any>(null);
  const subCategoryInputRef = useRef<any>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [excelModalOpen, setExcelModalOpen] = useState(false);
  const selectAllRef = useRef<any>(null);

  useEffect(() => {
    manage.resetList();
  }, []);

  // antd Table의 실제 스크롤 컨테이너(.ant-table-body)에 ref 연결
  useEffect(() => {
    const body = document.querySelector('.ant-table-body') as HTMLTableSectionElement;
    if (body) {
      tableBodyRef.current = body;
    }
  }, [manage.getItems().length]);

  useEffect(() => {
    if (!loaderRef.current || !tableBodyRef.current) {
      return;
    }

    const observer = new window.IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && manage.canFetchMore()) {
          manage.fetchNextPage();
        }
      },
      { threshold: 0.1, root: tableBodyRef.current }
    );
    observer.observe(loaderRef.current);
    return () => {
      observer.disconnect();
    };
  }, [loaderRef.current, tableBodyRef.current, manage.getItems().length]);

  useEffect(() => {
    if (editRowId) {
      nameInputRef.current?.focus();
      companyInputRef.current?.focus();
      companyKoreanInputRef.current?.focus();
      weightInputRef.current?.focus();
      categoryInputRef.current?.focus();
      subCategoryInputRef.current?.focus();
    }
  }, [editRowId]);

  const handleEdit = (row: RowType) => {
    setEditRowId(row.id);
    setEditRowValues({ ...row });
  };

  const handleEditChange = (field: keyof RowType, value: string) => {
    setEditRowValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditCancel = () => {
    setEditRowId(null);
    setEditRowValues({});
  };

  const handleEditSave = async () => {
    if (!editRowId) return;
    setLoading(true);
    try {
      const original = manage.getItems().find((item) => item.id === editRowId);
      if (!original) throw new Error('데이터 없음');
      // 변경된 값만 update
      const promises = [];
      if (editRowValues.name !== undefined && editRowValues.name !== original.name) {
        promises.push(manage.updateName(editRowId, editRowValues.name!));
      }
      if (editRowValues.company !== undefined && editRowValues.company !== original.company) {
        promises.push(manage.updateCompany(editRowId, editRowValues.company!));
      }
      if (editRowValues.weight !== undefined && editRowValues.weight !== original.weight) {
        promises.push(manage.updateWeight(editRowId, editRowValues.weight!));
      }
      if (editRowValues.category !== undefined && editRowValues.category !== original.category) {
        promises.push(manage.updateCategory(editRowId, editRowValues.category!));
      }
      if (
        editRowValues.subCategory !== undefined &&
        editRowValues.subCategory !== original.subCategory
      ) {
        promises.push(manage.updateSubCategory(editRowId, editRowValues.subCategory!));
      }
      await Promise.all(promises);
      message.success('수정되었습니다.');
      setEditRowId(null);
      setEditRowValues({});
    } catch (e) {
      message.error('수정에 실패했습니다.');
    }
    setLoading(false);
  };

  // 동적으로 최대 높이 계산
  const maxTableHeight = Math.max(window.innerHeight - 200, 400);

  const items = manage.getItems();
  const showLoaderRow = manage.canFetchMore();

  // antd Table row 커스텀: GearRow 사용
  const components = {
    body: {
      row: (props: any) => {
        const rowKey = props['data-row-key'];
        if (rowKey === 'loader') {
          return (
            <tr>
              <td colSpan={9} style={{ textAlign: 'center', padding: 16 }}>
                <div ref={loaderRef}>
                  <Spin />
                </div>
              </td>
            </tr>
          );
        }
        const gear = items.find((item) => item.id === rowKey);
        if (!gear) return <tr {...props} />;
        return <GearRow gear={gear} manage={manage} />;
      },
    },
  };

  // dataSource에 로딩용 row 추가
  const dataSource = showLoaderRow ? [...items, { id: 'loader', isLoader: true }] : items;

  // antd Table 정렬 변경 핸들러
  const handleTableChange = (_pagination: any, _filters: any, sorter: any) => {
    if (sorter && sorter.field && sorter.order) {
      const sortField = sorter.field;
      const sortOrder = sorter.order === 'ascend' ? 'asc' : 'desc';
      manage.setSort(sortField, sortOrder);
    }
  };

  // antd Table columns 정의
  const columns = [
    {
      title: (
        <Checkbox
          checked={manage.selectedIds.length === items.length && items.length > 0}
          indeterminate={manage.selectedIds.length > 0 && manage.selectedIds.length < items.length}
          onChange={(e) => {
            if (e.target.checked) {
              manage.selectAll(items.map((item) => item.id));
            } else {
              manage.clearSelected();
            }
          }}
        />
      ),
      dataIndex: 'checkbox',
      key: 'checkbox',
      width: 32,
      render: (_: any, record: any) => {
        if (record.isLoader) return null;
        return null; // 실제 체크박스는 GearRow에서 렌더링
      },
    },
    {
      title: '이름',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
    },
    {
      title: '회사',
      dataIndex: 'company',
      key: 'company',
      sorter: true,
    },
    {
      title: '회사(한글)',
      dataIndex: 'companyKorean',
      key: 'companyKorean',
      sorter: true,
    },
    {
      title: '이미지',
      dataIndex: 'imageUrl',
      key: 'image',
      width: 64,
      render: (url: string) =>
        url ? (
          <img
            src={url}
            alt='gear'
            style={{
              width: 48,
              height: 48,
              objectFit: 'contain',
              borderRadius: 6,
              border: '1px solid #eee',
              background: '#fafafa',
            }}
          />
        ) : (
          <div
            style={{
              width: 48,
              height: 48,
              background: '#f5f5f5',
              borderRadius: 6,
              border: '1px solid #eee',
            }}
          />
        ),
    },
    {
      title: '이미지URL',
      dataIndex: 'imageUrl',
      key: 'imageUrl',
      width: 200,
      render: (url: string) =>
        url ? (
          <a
            href={url}
            target='_blank'
            rel='noopener noreferrer'
            style={{ fontSize: 12, wordBreak: 'break-all' }}
          >
            {url}
          </a>
        ) : (
          '-'
        ),
    },
    {
      title: '색상',
      dataIndex: 'color',
      key: 'color',
      width: 100,
      render: (color: string) =>
        color ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                display: 'inline-block',
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: color,
                border: '1px solid #ccc',
              }}
            />
            <span>{color}</span>
          </span>
        ) : (
          '-'
        ),
    },
    {
      title: '무게',
      dataIndex: 'weight',
      key: 'weight',
      sorter: true,
    },
    {
      title: '카테고리',
      dataIndex: 'category',
      key: 'category',
      sorter: true,
    },
    {
      title: '서브카테고리',
      dataIndex: 'subCategory',
      key: 'subCategory',
      sorter: true,
    },
    {
      title: '등록일',
      dataIndex: 'createDate',
      key: 'createDate',
      sorter: true,
      render: (date: number) => (date ? new Date(date).toLocaleDateString() : '-'),
    },
    {
      title: '',
      key: 'actions',
      render: (_: any, record: any) => {
        if (record.isLoader) {
          return (
            <div ref={loaderRef} style={{ width: '100%', textAlign: 'center', padding: 12 }}>
              <Spin />
            </div>
          );
        }
        return null; // 실제 actions 버튼은 GearRow에서 렌더링
      },
    },
  ];

  return (
    <div style={{ maxWidth: '100vw', margin: '32px 0', padding: '0 2vw' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 28, color: '#222' }}>장비 관리</h1>
      <div style={{ marginBottom: 16 }}>
        <Button type='primary' onClick={() => setAddModalOpen(true)}>
          장비 추가
        </Button>
        <Button style={{ marginLeft: 8 }} onClick={() => setExcelModalOpen(true)}>
          엑셀로 장비 추가
        </Button>
        <Button
          danger
          style={{ marginLeft: 8 }}
          disabled={manage.selectedIds.length === 0}
          onClick={async () => {
            if (!window.confirm('선택된 항목을 모두 삭제하시겠습니까?')) return;
            await manage.deleteGears(manage.selectedIds);
            manage.clearSelected();
            message.success('선택된 항목이 모두 삭제되었습니다.');
          }}
        >
          선택 삭제
        </Button>
      </div>
      <SearchInput manager={manage} />
      <Table
        columns={columns}
        dataSource={dataSource}
        rowKey='id'
        components={components}
        pagination={false}
        bordered
        scroll={{ x: 900, y: maxTableHeight }}
        sticky
        loading={manage.isLoading() && items.length === 0}
        locale={{ emptyText: '등록된 장비가 없습니다.' }}
        onChange={handleTableChange}
      />
      <AddGearModal open={addModalOpen} onClose={() => setAddModalOpen(false)} manager={manage} />
      <AddGearExcelModal
        open={excelModalOpen}
        onClose={() => setExcelModalOpen(false)}
        manager={manage}
      />
    </div>
  );
};

export default observer(ManageView);
