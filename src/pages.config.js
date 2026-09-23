import Entrada from './pages/Entrada';
import Inventario from './pages/Inventario';
import Autorizacao from './pages/Autorizacao';
import Saida from './pages/Saida';
import Relatorios from './pages/Relatorios';
import MinhaArea from './pages/MinhaArea';
import __Layout from './Layout.jsx';

export const PAGES = {
    "Entrada": Entrada,
    "Inventario": Inventario,
    "Autorizacao": Autorizacao,
    "Saida": Saida,
    "Relatorios": Relatorios,
    "MinhaArea": MinhaArea,
}

export const pagesConfig = {
    mainPage: "Inventario",
    Pages: PAGES,
    Layout: __Layout,
};