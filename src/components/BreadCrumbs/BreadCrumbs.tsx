import "./BreadCrumbs.css";
import React from "react";
import { Link } from "react-router-dom";
import type { FC } from "react";

export interface ICrumb {
    label: string;
    to?: string;  // Необязательный путь для ссылки
}

export interface BreadcrumbsProps {
    crumbs: ICrumb[]; // Массив крошек передаётся сверху
}

export const Breadcrumbs: FC<BreadcrumbsProps> = ({ crumbs }) => {
    return (
        <nav className="app-breadcrumbs" aria-label="Навигационная цепочка">
            <ol className="app-breadcrumbs__list">
                {crumbs.map((crumb, i) => {
                    const last = i === crumbs.length - 1;
                    return (
                        <li key={`${crumb.label}-${i}`} className="app-breadcrumbs__item">
                            {crumb.to && !last ? ( // Если есть 'to' и это НЕ последний элемент
                                <Link to={crumb.to} className="app-breadcrumbs__link">
                                    {crumb.label}
                                </Link>
                            ) : (
                                <span
                                    className={last ? "app-breadcrumbs__current" : undefined}
                                    aria-current={last ? "page" : undefined}
                                >
                  {crumb.label}
                </span>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
};