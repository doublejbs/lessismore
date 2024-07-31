import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import firebase from "./firebase/Firebase.ts";
import {
  Alert,
  Button,
  Checkbox,
  ConfigProvider,
  Form,
  FormProps,
  Input,
  Layout,
} from "antd";

type FieldType = {
  email?: string;
  password?: string;
};

const LogIn = () => {
  const navigate = useNavigate();
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const onFinish: FormProps<FieldType>["onFinish"] = async ({
    email,
    password,
  }) => {
    try {
      if (email && password) {
        await firebase.login(email, password);
        navigate("/bag");
      }
    } catch (e: any) {
      setErrorMessage(e.message);
      setShowError(true);
    }
  };

  const handleClickGoogle = async () => {
    await firebase.logInWithGoogle();
    navigate("/");
  };

  const handleClickJoin = () => {
    navigate("/join");
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "black",
        },
      }}
    >
      {showError && (
        <Alert
          message="Error"
          description={errorMessage}
          type="error"
          showIcon
        />
      )}
      <Layout
        style={{
          display: "flex",
          justifyContent: "center",
          flexDirection: "row",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            maxWidth: "400px",
          }}
        >
          <div
            style={{
              fontWeight: "bold",
              fontSize: "xxx-large",
              alignContent: "end",
            }}
          >
            USELESS
          </div>
          <div style={{ marginTop: "20px" }}>
            <Form
              initialValues={{ remember: true }}
              onFinish={onFinish}
              style={{
                width: "350px",
              }}
            >
              <Form.Item
                name="email"
                rules={[{ required: true, message: "이메일을 입력해주세요." }]}
              >
                <Input placeholder="이메일" />
              </Form.Item>
              <Form.Item
                name="password"
                rules={[
                  { required: true, message: "비밀번호를 입력해주세요." },
                ]}
              >
                <Input type="password" placeholder="비밀번호" />
              </Form.Item>
              <Form.Item>
                <Form.Item name="remember" valuePropName="checked" noStyle>
                  <Checkbox>아이디 저장</Checkbox>
                </Form.Item>
              </Form.Item>
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  style={{
                    width: "100%",
                  }}
                >
                  로그인
                </Button>
              </Form.Item>

              <Form.Item>
                <Button
                  style={{
                    width: "100%",
                  }}
                  onClick={handleClickJoin}
                >
                  회원가입
                </Button>
              </Form.Item>
              <Form.Item>
                <a
                  onClick={handleClickGoogle}
                  style={{
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <img
                    src={"/web_light_sq_SI.svg"}
                    alt={"google"}
                    width={175}
                    height={32}
                  />
                </a>
              </Form.Item>
            </Form>
          </div>
          <div
            style={{
              height: "10%",
            }}
          ></div>
        </div>
      </Layout>
    </ConfigProvider>
  );
};

export default LogIn;
