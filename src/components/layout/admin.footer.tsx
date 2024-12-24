'use client'
import { Layout } from 'antd';

const AdminFooter = () => {
    const { Footer } = Layout;

    return (
        <>
            <Footer style={{ textAlign: 'center' }}>
            NguyenKhanhDuy ©{new Date().getFullYear()} Created by NguyenKhanhDuy
            </Footer>
        </>
    )
}

export default AdminFooter;