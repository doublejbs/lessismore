import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  DatePicker,
  Descriptions,
  Form,
  Input,
  message,
  Modal,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import { Dayjs } from 'dayjs';
import { collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, setDoc } from 'firebase/firestore';
import app from '../App';
import { formatDateTime, formatPeriod, toDayjs, toIsoString } from './AdminDateUtil';
import FeaturePopupPreview from './FeaturePopupPreview';

// 팝업 항목(카드 리스트 한 줄) 형태 — 앱은 앞 3개만 렌더한다.
interface FeaturePopupItem {
  imageUrl?: string;
  title: string;
  description?: string;
  link?: string;
}

// 작성/편집 폼 값 형태. 날짜는 antd DatePicker와 맞물리도록 Dayjs로 다룬다.
interface FeaturePopupFormValues {
  id: string;
  title: string;
  subtitle?: string;
  items?: { imageUrl?: string; title: string; description?: string; link?: string }[];
  buttonLabel?: string;
  buttonLink?: string;
  showSkip: boolean;
  forced: boolean;
  startAt?: Dayjs;
  endAt?: Dayjs;
}

// 보관함(feature-popups/{id}) 문서 형태. 선택 필드는 값이 있을 때만 포함한다.
interface FeaturePopupArchiveDoc {
  id: string;
  title: string;
  subtitle?: string;
  items?: FeaturePopupItem[];
  buttonLabel?: string;
  buttonLink?: string;
  showSkip: boolean;
  forced: boolean;
  startAt?: string;
  endAt?: string;
  createdAt: string;
  updatedAt: string;
}

// 라이브(config/featurePopup) 문서 형태 — 앱이 실시간 구독하는 계약이므로 변경 금지.
interface FeaturePopupLiveDoc {
  id: string;
  active: boolean;
  title: string;
  subtitle?: string;
  items?: FeaturePopupItem[];
  buttonLabel?: string;
  buttonLink?: string;
  showSkip: boolean;
  forced: boolean;
  startAt?: string;
  endAt?: string;
}

const LIVE_DOC_PATH = ['config', 'featurePopup'] as const;
const ARCHIVE_COLLECTION = 'feature-popups';
const MAX_ITEMS = 3;

const FeaturePopupTabView = () => {
  const [form] = Form.useForm<FeaturePopupFormValues>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [liveDoc, setLiveDoc] = useState<FeaturePopupLiveDoc | null>(null);
  const [archiveList, setArchiveList] = useState<FeaturePopupArchiveDoc[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // 미리보기 실시간 갱신용 폼 값 구독(Modal이 닫혀 있어도 안전).
  const watchedTitle = Form.useWatch('title', form);
  const watchedSubtitle = Form.useWatch('subtitle', form);
  const watchedItems = Form.useWatch('items', form);
  const watchedButtonLabel = Form.useWatch('buttonLabel', form);
  const watchedButtonLink = Form.useWatch('buttonLink', form);
  const watchedShowSkip = Form.useWatch('showSkip', form);
  const watchedForced = Form.useWatch('forced', form);

  const firebase = app.getFirebase();

  const getLiveDocRef = () => {
    return doc(firebase.getStore(), ...LIVE_DOC_PATH);
  };

  const getArchiveDocRef = (id: string) => {
    return doc(firebase.getStore(), ARCHIVE_COLLECTION, id);
  };

  const loadLive = async () => {
    const snapshot = await getDoc(getLiveDocRef());

    if (snapshot.exists()) {
      setLiveDoc(snapshot.data() as FeaturePopupLiveDoc);
    } else {
      setLiveDoc(null);
    }
  };

  const loadArchive = async () => {
    const snapshot = await getDocs(
      query(collection(firebase.getStore(), ARCHIVE_COLLECTION), orderBy('updatedAt', 'desc'))
    );

    setArchiveList(snapshot.docs.map((item) => item.data() as FeaturePopupArchiveDoc));
  };

  // 진입 시 라이브 문서와 보관함 목록을 1회 조회한다.
  useEffect(() => {
    const loadAll = async () => {
      try {
        await Promise.all([loadLive(), loadArchive()]);
      } catch (error) {
        console.error('신기능 팝업 데이터 로드 실패:', error);
        message.error('신기능 팝업 데이터를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, []);

  // 항목 배열의 선택 필드를 정리한다(빈 문자열 저장 금지).
  const buildItems = (items?: FeaturePopupFormValues['items']): FeaturePopupItem[] => {
    if (!items) {
      return [];
    }

    return items.map((item) => {
      const built: FeaturePopupItem = { title: item.title.trim() };

      const imageUrl = item.imageUrl?.trim();

      if (imageUrl) {
        built.imageUrl = imageUrl;
      }

      const description = item.description?.trim();

      if (description) {
        built.description = description;
      }

      const link = item.link?.trim();

      if (link) {
        built.link = link;
      }

      return built;
    });
  };

  // 폼 값을 보관함 문서 형태로 변환. 선택 필드가 비면 키를 넣지 않는다(빈 문자열 저장 금지).
  const buildArchivePayload = (values: FeaturePopupFormValues): FeaturePopupArchiveDoc => {
    const id = values.id.trim();
    const existing = archiveList.find((item) => item.id === id);
    const now = new Date().toISOString();

    const payload: FeaturePopupArchiveDoc = {
      id,
      title: values.title.trim(),
      showSkip: !!values.showSkip,
      forced: !!values.forced,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    };

    const subtitle = values.subtitle?.trim();

    if (subtitle) {
      payload.subtitle = subtitle;
    }

    const items = buildItems(values.items);

    if (items.length > 0) {
      payload.items = items;
    }

    const buttonLabel = values.buttonLabel?.trim();

    if (buttonLabel) {
      payload.buttonLabel = buttonLabel;
    }

    const buttonLink = values.buttonLink?.trim();

    if (buttonLink) {
      payload.buttonLink = buttonLink;
    }

    const startAt = toIsoString(values.startAt);

    if (startAt) {
      payload.startAt = startAt;
    }

    const endAt = toIsoString(values.endAt);

    if (endAt) {
      payload.endAt = endAt;
    }

    return payload;
  };

  // 보관함 항목의 콘텐츠 필드만 라이브 문서 형태로 변환(createdAt/updatedAt 제외, active: true).
  const buildLivePayload = (item: FeaturePopupArchiveDoc): FeaturePopupLiveDoc => {
    const payload: FeaturePopupLiveDoc = {
      id: item.id,
      active: true,
      title: item.title,
      showSkip: item.showSkip,
      forced: !!item.forced,
    };

    if (item.subtitle) {
      payload.subtitle = item.subtitle;
    }

    if (item.items && item.items.length > 0) {
      payload.items = item.items;
    }

    if (item.buttonLabel) {
      payload.buttonLabel = item.buttonLabel;
    }

    if (item.buttonLink) {
      payload.buttonLink = item.buttonLink;
    }

    if (item.startAt) {
      payload.startAt = item.startAt;
    }

    if (item.endAt) {
      payload.endAt = item.endAt;
    }

    return payload;
  };

  const handleClickCreate = () => {
    setEditingId(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleClickEdit = (item: FeaturePopupArchiveDoc) => {
    setEditingId(item.id);
    form.setFieldsValue({
      id: item.id,
      title: item.title,
      subtitle: item.subtitle ?? '',
      items: (item.items ?? []).map((entry) => ({
        imageUrl: entry.imageUrl ?? '',
        title: entry.title,
        description: entry.description ?? '',
        link: entry.link ?? '',
      })),
      buttonLabel: item.buttonLabel ?? '',
      buttonLink: item.buttonLink ?? '',
      showSkip: item.showSkip ?? true,
      forced: item.forced ?? false,
      startAt: toDayjs(item.startAt),
      endAt: toDayjs(item.endAt),
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // 보관함에 저장(문서 키 = id). 편집 중 id를 바꾸면 새 항목으로 저장되고 기존 항목은 남는다.
  const handleSubmitForm = async () => {
    let values: FeaturePopupFormValues;

    try {
      values = await form.validateFields();
    } catch {
      // 필수값 누락 안내는 폼이 담당.
      return;
    }

    setSaving(true);

    try {
      const payload = buildArchivePayload(values);

      await setDoc(getArchiveDocRef(payload.id), payload);
      await loadArchive();
      setIsModalOpen(false);
      message.success('보관함에 저장되었습니다.');
    } catch (error) {
      console.error('신기능 팝업 저장 실패:', error);
      message.error('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // 발행: 보관함 항목을 active: true로 라이브 문서에 전체 덮어쓰기.
  // 팝업 닫음은 id 단위 영구라, 라이브와 다른 id를 발행하면 닫았던 사용자에게도 다시 뜬다.
  const handleClickPublish = (item: FeaturePopupArchiveDoc) => {
    const isNewId = !!liveDoc && liveDoc.id !== item.id;
    const isForced = !!item.forced;

    // 경고 문구 구성: 강제 모드 경고와 id 변경 경고는 병행 표시한다.
    const warnings: string[] = [];

    if (isForced) {
      warnings.push(
        '⚠️ 강제(차단형) 팝업입니다. 발행하면 사용자가 닫을 수 없고, 내리려면 이 어드민에서 라이브를 끄거나 내려야 합니다.'
      );
    }

    if (isNewId) {
      warnings.push(
        `⚠️ 현재 라이브 팝업(id: ${liveDoc?.id})과 id가 다릅니다. 팝업 닫음은 id 단위로 영구 저장되므로, 이전 팝업을 닫았던 모든 사용자에게 새로 노출됩니다.`
      );
    }

    Modal.confirm({
      title: '이 항목을 라이브로 발행할까요?',
      content:
        warnings.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {warnings.map((warning, index) => (
              <div key={index}>{warning}</div>
            ))}
          </div>
        ) : (
          `id "${item.id}" 항목이 앱에 즉시 노출됩니다.`
        ),
      okText: '발행',
      cancelText: '취소',
      onOk: async () => {
        try {
          const payload = buildLivePayload(item);

          await setDoc(getLiveDocRef(), payload);
          setLiveDoc(payload);
          message.success('발행되었습니다.');
        } catch (error) {
          console.error('신기능 팝업 발행 실패:', error);
          message.error('발행에 실패했습니다.');
        }
      },
    });
  };

  // 끄기: 라이브 문서는 두고 active만 false로 저장해 노출만 중단한다.
  const handleClickTurnOff = async () => {
    if (!liveDoc) {
      return;
    }

    try {
      const payload: FeaturePopupLiveDoc = { ...liveDoc, active: false };

      await setDoc(getLiveDocRef(), payload);
      setLiveDoc(payload);
      message.success('노출을 껐습니다.');
    } catch (error) {
      console.error('신기능 팝업 끄기 실패:', error);
      message.error('끄기에 실패했습니다.');
    }
  };

  // 내리기: 라이브 문서를 삭제해 팝업을 완전히 제거한다(보관함은 유지).
  const handleClickTakeDown = () => {
    Modal.confirm({
      title: '라이브 팝업을 내리시겠습니까?',
      content: '라이브 문서가 삭제되어 앱에서 팝업이 완전히 사라집니다. 보관함 항목은 유지됩니다.',
      okText: '내리기',
      okButtonProps: { danger: true },
      cancelText: '취소',
      onOk: async () => {
        try {
          await deleteDoc(getLiveDocRef());
          setLiveDoc(null);
          message.success('라이브 팝업을 내렸습니다.');
        } catch (error) {
          console.error('신기능 팝업 내리기 실패:', error);
          message.error('내리기에 실패했습니다.');
        }
      },
    });
  };

  // 보관함 항목 삭제: 보관함에서만 지우며 라이브 노출에는 영향이 없다.
  const handleClickDelete = (item: FeaturePopupArchiveDoc) => {
    Modal.confirm({
      title: '보관함에서 삭제하시겠습니까?',
      content: '보관함에서만 삭제되며, 라이브 노출에는 영향이 없습니다.',
      okText: '삭제',
      okButtonProps: { danger: true },
      cancelText: '취소',
      onOk: async () => {
        try {
          await deleteDoc(getArchiveDocRef(item.id));
          await loadArchive();
          message.success('삭제되었습니다.');
        } catch (error) {
          console.error('신기능 팝업 보관함 삭제 실패:', error);
          message.error('삭제에 실패했습니다.');
        }
      },
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
        <Spin />
      </div>
    );
  }

  const columns = [
    {
      title: 'id',
      dataIndex: 'id',
      key: 'id',
      render: (id: string, item: FeaturePopupArchiveDoc) => (
        <Space>
          <span>{id}</span>
          {liveDoc?.id === id && <Tag color='green'>LIVE</Tag>}
          {item.forced && <Tag color='red'>강제</Tag>}
        </Space>
      ),
    },
    {
      title: '요약',
      dataIndex: 'title',
      key: 'title',
      render: (value: string) => (
        <Typography.Text style={{ maxWidth: 240 }} ellipsis>
          {value}
        </Typography.Text>
      ),
    },
    {
      title: '기간',
      key: 'period',
      render: (_: unknown, item: FeaturePopupArchiveDoc) => formatPeriod(item.startAt, item.endAt),
    },
    {
      title: '수정일',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (value: string) => formatDateTime(value),
    },
    {
      title: '액션',
      key: 'actions',
      render: (_: unknown, item: FeaturePopupArchiveDoc) => (
        <Space>
          <Button size='small' type='primary' onClick={() => handleClickPublish(item)}>
            발행
          </Button>
          <Button size='small' onClick={() => handleClickEdit(item)}>
            편집
          </Button>
          <Button size='small' danger onClick={() => handleClickDelete(item)}>
            삭제
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card title='라이브 상태' style={{ marginBottom: 24 }}>
        {liveDoc ? (
          <>
            <Descriptions column={1} size='small' style={{ marginBottom: 16 }}>
              <Descriptions.Item label='id'>{liveDoc.id}</Descriptions.Item>
              <Descriptions.Item label='상태'>
                <Space>
                  {liveDoc.active ? <Tag color='green'>ON</Tag> : <Tag>OFF</Tag>}
                  {liveDoc.forced && <Tag color='red'>강제</Tag>}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label='제목'>
                <Typography.Text style={{ maxWidth: 400 }} ellipsis>
                  {liveDoc.title}
                </Typography.Text>
              </Descriptions.Item>
              <Descriptions.Item label='기간'>
                {formatPeriod(liveDoc.startAt, liveDoc.endAt)}
              </Descriptions.Item>
            </Descriptions>
            <Space>
              <Button onClick={handleClickTurnOff} disabled={!liveDoc.active}>
                끄기
              </Button>
              <Button danger onClick={handleClickTakeDown}>
                내리기
              </Button>
            </Space>
          </>
        ) : (
          <Typography.Text type='secondary'>발행된 항목 없음</Typography.Text>
        )}
      </Card>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <Typography.Title level={5} style={{ margin: 0 }}>
          보관함
        </Typography.Title>
        <Button type='primary' onClick={handleClickCreate}>
          새로 만들기
        </Button>
      </div>
      <Table
        rowKey='id'
        columns={columns}
        dataSource={archiveList}
        pagination={false}
        size='small'
        locale={{ emptyText: '보관함이 비어 있습니다.' }}
      />

      <Modal
        title={editingId ? '신기능 팝업 편집' : '신기능 팝업 작성'}
        open={isModalOpen}
        onOk={handleSubmitForm}
        onCancel={handleCloseModal}
        okText='보관함에 저장'
        cancelText='취소'
        confirmLoading={saving}
        width={960}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
          <div style={{ flex: 1, minWidth: 360 }}>
            <Form
              form={form}
              layout='vertical'
              disabled={saving}
              requiredMark
              initialValues={{ showSkip: true, forced: false }}
            >
              <Form.Item
                label='팝업 id'
                name='id'
                rules={[{ required: true, message: 'id를 입력해주세요.' }]}
                extra={
                  editingId
                    ? 'id를 바꾸면 새 항목으로 저장됩니다(기존 항목은 보관함에 남습니다). 팝업 닫음은 id 단위 영구라 새 id 발행 시 모두에게 다시 뜹니다.'
                    : '보관함 문서 키로 사용됩니다. 예: 2026-07-feature-popup'
                }
              >
                <Input placeholder='예: 2026-07-feature-popup' />
              </Form.Item>

              <Form.Item
                label='제목'
                name='title'
                rules={[{ required: true, message: '제목을 입력해주세요.' }]}
                extra='줄바꿈이 그대로 표시됩니다.'
              >
                <Input.TextArea rows={2} placeholder='팝업 상단 제목' />
              </Form.Item>

              <Form.Item label='부제목 (선택)' name='subtitle'>
                <Input placeholder='제목 아래 보조 문구' />
              </Form.Item>

              <Form.Item label={`소개 항목 (최대 ${MAX_ITEMS}개 — 앱은 앞 3개만 표시)`}>
                <Form.List name='items'>
                  {(fields, { add, remove }) => (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {fields.map((field) => (
                        <Card
                          key={field.key}
                          size='small'
                          title={`항목 ${field.name + 1}`}
                          extra={
                            <Button size='small' danger type='text' onClick={() => remove(field.name)}>
                              삭제
                            </Button>
                          }
                        >
                          <Form.Item label='이미지 URL (선택)' name={[field.name, 'imageUrl']}>
                            <Input placeholder='https://...' />
                          </Form.Item>
                          <Form.Item
                            label='항목 제목'
                            name={[field.name, 'title']}
                            rules={[{ required: true, message: '항목 제목을 입력해주세요.' }]}
                          >
                            <Input placeholder='기능 이름' />
                          </Form.Item>
                          <Form.Item label='설명 (선택)' name={[field.name, 'description']}>
                            <Input placeholder='한 줄 설명' />
                          </Form.Item>
                          <Form.Item
                            label='링크 (선택)'
                            name={[field.name, 'link']}
                            style={{ marginBottom: 0 }}
                          >
                            <Input placeholder='예: /bag 또는 https://example.com' />
                          </Form.Item>
                        </Card>
                      ))}
                      {fields.length < MAX_ITEMS && (
                        <Button type='dashed' onClick={() => add()} block>
                          + 항목 추가
                        </Button>
                      )}
                    </div>
                  )}
                </Form.List>
              </Form.Item>

              <Form.Item
                label='버튼 문구 (선택)'
                name='buttonLabel'
                extra='비우면 앱 기본값 "확인"이 사용됩니다.'
              >
                <Input placeholder='예: 지금 써보기' />
              </Form.Item>

              <Form.Item label='버튼 링크 (선택)' name='buttonLink'>
                <Input placeholder='예: /bag 또는 https://example.com' />
              </Form.Item>

              <Form.Item
                label='건너뛰기 노출'
                name='showSkip'
                valuePropName='checked'
                extra={
                  watchedForced
                    ? '강제 모드가 켜져 있어 이 설정은 무시됩니다(건너뛰기 항상 숨김).'
                    : '끄면 팝업에 "건너뛰기"가 표시되지 않습니다.'
                }
              >
                <Switch checkedChildren='ON' unCheckedChildren='OFF' disabled={!!watchedForced} />
              </Form.Item>

              <Form.Item
                label='강제 모드'
                name='forced'
                valuePropName='checked'
                extra='켜면 사용자가 닫을 수 없는 차단형 팝업이 됩니다. 건너뛰기·닫기 경로가 사라지고, 아이템 링크는 비활성, 메인 버튼은 링크 이동만 합니다(링크 없으면 버튼 숨김). 내리려면 라이브를 끄거나 내려야 합니다.'
              >
                <Switch checkedChildren='ON' unCheckedChildren='OFF' />
              </Form.Item>

              <Form.Item label='노출 시작 (선택)' name='startAt'>
                <DatePicker showTime style={{ width: '100%' }} placeholder='노출 시작 일시' />
              </Form.Item>

              <Form.Item label='노출 종료 (선택)' name='endAt'>
                <DatePicker showTime style={{ width: '100%' }} placeholder='노출 종료 일시' />
              </Form.Item>
            </Form>
          </div>
          <div style={{ width: 340, flexShrink: 0 }}>
            <FeaturePopupPreview
              title={watchedTitle ?? ''}
              subtitle={watchedSubtitle?.trim() ? watchedSubtitle.trim() : undefined}
              items={watchedItems ?? []}
              buttonLabel={watchedButtonLabel?.trim() ? watchedButtonLabel.trim() : undefined}
              showSkip={watchedShowSkip ?? true}
              forced={watchedForced ?? false}
              hasButtonLink={!!watchedButtonLink?.trim()}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FeaturePopupTabView;
