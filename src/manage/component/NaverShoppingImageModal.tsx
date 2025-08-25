import { useState } from 'react';
import { Modal, Button, Table, message, Progress } from 'antd';
import { observer } from 'mobx-react-lite';
import Manage from '../model/Manage';
import ManagerGear from '../model/ManagerGear';

interface Props {
  open: boolean;
  onClose: () => void;
  selectedGears: ManagerGear[];
  manage: Manage;
}

const NaverShoppingImageModal = ({ open, onClose, selectedGears, manage }: Props) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentGear, setCurrentGear] = useState<string>('');
  const [naverImages, setNaverImages] = useState<Record<string, string>>({});

  const fetchNaverShoppingImage = async (query: string) => {
    const response = await fetch(
      `https://asia-northeast3-lessismore-7e070.cloudfunctions.net/naverShoppingSearch?query=${encodeURIComponent(query)}`,
      {
        method: 'GET',
      }
    );

    if (!response.ok) {
      throw new Error(`네이버 API 호출 실패: ${response.status}`);
    }

    const data = await response.json();

    if (data.items && data.items.length > 0) {
      return data.items[0].image;
    }
    return null;
  };

  const handleFetchImages = async () => {
    if (selectedGears.length === 0) {
      message.warning('선택된 장비가 없습니다.');
      return;
    }

    setLoading(true);
    setProgress(0);

    try {
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < selectedGears.length; i++) {
        const gear = selectedGears[i];
        setCurrentGear(gear.name);
        setProgress(((i + 1) / selectedGears.length) * 100);

        try {
          // 검색 쿼리 생성 (name, company, companyKorean 조합)
          const query = `${gear.company} ${gear.companyKorean} ${gear.name} ${gear.color}`;

          let imageUrl = null;

          // API 호출로 이미지 검색
          try {
            imageUrl = await fetchNaverShoppingImage(query);
          } catch (error) {
            console.warn(`검색 실패: ${query}`, error);
          }
          // API 호출 간 간격
          await new Promise((resolve) => setTimeout(resolve, 100));

          if (imageUrl) {
            // 네이버 이미지 상태에 저장
            setNaverImages((prev) => ({ ...prev, [gear.id]: imageUrl }));
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          console.error(`장비 ${gear.name} 이미지 가져오기 실패:`, error);
          failCount++;
        }

        // API 호출 간 간격
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      if (successCount > 0) {
        message.success(`${successCount}개 장비의 이미지 URL을 성공적으로 가져왔습니다.`);
      }
      if (failCount > 0) {
        message.warning(`${failCount}개 장비의 이미지 URL을 가져오지 못했습니다.`);
      }

      // 모달을 닫지 않고 결과를 표시
    } catch (error) {
      console.error('이미지 URL 가져오기 실패:', error);
      message.error('이미지 URL 가져오기에 실패했습니다.');
    } finally {
      setLoading(false);
      setProgress(0);
      setCurrentGear('');
    }
  };

  const handleClose = () => {
    setNaverImages({});
    onClose();
  };

  const handleSaveNaverImages = async () => {
    const naverImageEntries = Object.entries(naverImages);
    if (naverImageEntries.length === 0) {
      message.warning('저장할 네이버 쇼핑 이미지가 없습니다.');
      return;
    }

    setLoading(true);
    try {
      let successCount = 0;
      let failCount = 0;

      for (const [gearId, imageUrl] of naverImageEntries) {
        try {
          await manage.updateImageUrl(gearId, imageUrl);
          successCount++;
        } catch (error) {
          console.error(`장비 ${gearId} 이미지 저장 실패:`, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        message.success(`${successCount}개 장비의 이미지 URL이 저장되었습니다.`);
      }
      if (failCount > 0) {
        message.error(`${failCount}개 장비의 이미지 URL 저장에 실패했습니다.`);
      }

      // 저장 완료 후 모달 닫기
      handleClose();
    } catch (error) {
      console.error('이미지 URL 저장 실패:', error);
      message.error('이미지 URL 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: '이름',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '회사',
      dataIndex: 'company',
      key: 'company',
    },
    {
      title: '현재 이미지',
      dataIndex: 'imageUrl',
      key: 'currentImage',
      width: 100,
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              color: '#999',
            }}
          >
            없음
          </div>
        ),
    },
    {
      title: '네이버 쇼핑 이미지',
      key: 'naverImage',
      width: 100,
      render: (_: any, record: ManagerGear) => {
        const naverImageUrl = naverImages[record.id];
        return naverImageUrl ? (
          <img
            src={naverImageUrl}
            alt='naver shopping'
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              color: '#999',
            }}
          >
            {loading ? '검색중...' : '없음'}
          </div>
        );
      },
    },
  ];

  return (
    <Modal
      title='네이버 쇼핑 이미지 URL 가져오기'
      open={open}
      onCancel={handleClose}
      width={1000}
      footer={[
        <Button key='cancel' onClick={handleClose} disabled={loading}>
          취소
        </Button>,
        <Button key='fetch' type='primary' onClick={handleFetchImages} loading={loading}>
          이미지 URL 가져오기
        </Button>,
        <Button
          key='save'
          type='default'
          onClick={handleSaveNaverImages}
          disabled={loading || Object.keys(naverImages).length === 0}
          style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', color: 'white' }}
        >
          네이버 쇼핑 이미지 URL 저장하기 ({Object.keys(naverImages).length}개)
        </Button>,
      ]}
    >
      <div style={{ marginBottom: 16 }}>
        <p>
          선택된 {selectedGears.length}개의 장비에 대해 네이버 쇼핑에서 이미지 URL을 가져옵니다.
        </p>
        {loading && (
          <div style={{ marginTop: 16 }}>
            <Progress percent={Math.round(progress)} />
            <p style={{ marginTop: 8, color: '#666' }}>진행 중: {currentGear}</p>
          </div>
        )}
      </div>

      <Table
        columns={columns}
        dataSource={selectedGears}
        rowKey='id'
        pagination={{ pageSize: 10 }}
        scroll={{ y: 400 }}
        size='small'
      />
    </Modal>
  );
};

export default observer(NaverShoppingImageModal);
