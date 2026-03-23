document.addEventListener('DOMContentLoaded', async () => {
    // 快捷键聚焦搜索框 (Cmd/Ctrl + K)
    const searchInput = document.querySelector('input[name="q"]');
    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            searchInput.focus();
        }
    });

    // 获取 DOM 元素
    const initialView = document.getElementById('initial-view');
    const searchNavContainer = document.getElementById('search-nav-container');
    const stickyHolder = document.getElementById('sticky-holder');
    const recommendedSection = document.getElementById('recommended-section');
    const mainContent = document.getElementById('main-content');
    const categoryBar = document.getElementById('category-bar');
    const recommendedGrid = document.getElementById('recommended-grid');

    // 状态变量
    let isScrolled = false;
    let yamlData = [];
    let currentCategory = 'all';
    let currentSearchQuery = '';

    // 加载并解析 YAML 数据
    try {
        const response = await fetch('config.yml');
        const yamlText = await response.text();
        yamlData = jsyaml.load(yamlText);
        
        renderCategories();
        renderRecommended();
        renderMainContent();
    } catch (error) {
        console.error('Error loading config.yml:', error);
    }

    // 搜索表单逻辑
    const searchForm = document.getElementById('search-form');
    const searchEngineSelect = document.getElementById('search-engine-select');
    
    // 监听输入框实时搜索本站内容
    searchInput.addEventListener('input', (e) => {
        if (searchEngineSelect.value === 'local') {
            currentSearchQuery = e.target.value.trim().toLowerCase();
            renderMainContent();
            if (currentSearchQuery && !isScrolled) {
                enableStickyMode();
            }
        }
    });

    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = searchInput.value.trim();
        const engine = searchEngineSelect.value;

        if (engine === 'local') {
            currentSearchQuery = query.toLowerCase();
            renderMainContent();
            enableStickyMode();
        } else if (query) {
            let url = '';
            if (engine === 'bing') {
                url = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
            } else if (engine === 'google') {
                url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
            } else if (engine === 'baidu') {
                url = `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`;
            }
            if (url) window.open(url, '_blank');
        }
    });

    // 切换搜索引擎时，如果之前有本地搜索内容，清空它并重新渲染
    searchEngineSelect.addEventListener('change', (e) => {
        if (e.target.value !== 'local' && currentSearchQuery) {
            currentSearchQuery = '';
            renderMainContent();
        }
    });

    // 主题切换逻辑
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const htmlElement = document.documentElement;

    // 检查本地存储中的主题偏好
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'light') {
        htmlElement.classList.remove('dark');
        themeIcon.textContent = 'dark_mode';
    } else {
        htmlElement.classList.add('dark');
        themeIcon.textContent = 'light_mode';
    }

    themeToggleBtn.addEventListener('click', () => {
        if (htmlElement.classList.contains('dark')) {
            htmlElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
            themeIcon.textContent = 'dark_mode';
        } else {
            htmlElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            themeIcon.textContent = 'light_mode';
        }
    });

    // 渲染分类导航
    function renderCategories() {
        categoryBar.innerHTML = '';
        
        // 添加"全部"按钮
        const allBtn = createCategoryButton('首页', 'all');
        allBtn.classList.add('bg-tertiary', 'text-white', 'dark:text-on-tertiary', 'font-bold');
        allBtn.classList.remove('bg-white', 'dark:bg-surface-container-low', 'text-gray-600', 'dark:text-on-surface-variant', 'font-medium');
        categoryBar.appendChild(allBtn);

        // 添加其他分类按钮 (包括"常用推荐")
        yamlData.forEach(category => {
            const btn = createCategoryButton(category.taxonomy, category.taxonomy);
            categoryBar.appendChild(btn);
        });

        setupCategoryListeners();
    }

    function createCategoryButton(text, target) {
        const btn = document.createElement('button');
        btn.className = 'category-btn px-6 py-2 rounded-full bg-white dark:bg-surface-container-low text-gray-600 dark:text-on-surface-variant hover:bg-gray-100 dark:hover:bg-surface-bright font-medium text-sm whitespace-nowrap transition-all border border-gray-200 dark:border-none';
        btn.setAttribute('data-target', target);
        btn.textContent = text;
        return btn;
    }

    // 辅助函数：生成卡片 HTML
    function generateCardHTML(link) {
        // 根据是否有 logo 决定显示的图标
        let iconHTML = '';
        if (link.logo) {
            // 这里为了演示，如果是本地路径图片可能无法加载，如果是字体图标直接显示。实际中需确保路径正确
            iconHTML = `<img alt="${link.title}" class="w-full h-full object-contain filter invert-0 dark:invert" src="static/logo/${link.logo}" onerror="this.src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='"/>`;
        } else {
            iconHTML = `<span class="material-symbols-outlined text-tertiary text-3xl">link</span>`;
        }

        const description = link.description || link.title;

        return `
            <a class="group flex items-center bg-white dark:bg-surface-container border border-gray-200 dark:border-outline-variant/30 rounded-xl p-3 md:p-5 hover:bg-gray-50 dark:hover:bg-surface-bright transition-all duration-300 transform hover:scale-[1.02] relative overflow-hidden shadow-sm dark:shadow-none" href="${link.url}" target="_blank">
                <div class="w-10 h-10 md:w-16 md:h-16 rounded-full bg-gray-100 dark:bg-surface-container-highest flex items-center justify-center flex-shrink-0 mr-3 md:mr-5 group-hover:bg-tertiary/10 transition-colors overflow-hidden p-2 md:p-3">
                    ${iconHTML}
                </div>
                <div class="flex flex-col flex-grow min-w-0">
                    <h3 class="font-manrope font-bold text-gray-800 dark:text-on-surface text-base md:text-xl mb-0.5 truncate">${link.title}</h3>
                    <p class="text-gray-500 dark:text-on-surface-variant text-xs md:text-sm font-medium line-clamp-1 truncate">${description}</p>
                </div>
            </a>
        `;
    }

    // 渲染常用推荐 (前四个)
    function renderRecommended() {
        recommendedGrid.innerHTML = '';
        const recommendedCategory = yamlData.find(c => c.taxonomy === '常用推荐');
        if (recommendedCategory && recommendedCategory.links) {
            const top4 = recommendedCategory.links.slice(0, 4);
            top4.forEach(link => {
                recommendedGrid.innerHTML += generateCardHTML(link);
            });
        }
    }

    // 渲染主体内容
    function renderMainContent() {
        mainContent.innerHTML = '';
        
        let hasAnyResults = false;

        yamlData.forEach(category => {
            // 过滤逻辑
            if (currentCategory !== 'all' && currentCategory !== category.taxonomy) return;

            let filteredList = [];
            let filteredLinks = [];

            if (currentSearchQuery) {
                const searchTerms = currentSearchQuery.split(/\s+/).filter(Boolean);
                // 如果有搜索词，我们需要过滤 links
                if (category.list) {
                    category.list.forEach(termItem => {
                        if (termItem.links) {
                            const matchedLinks = termItem.links.filter(link => {
                                return searchTerms.every(term => 
                                    link.title.toLowerCase().includes(term) || 
                                    (link.description && link.description.toLowerCase().includes(term))
                                );
                            });
                            if (matchedLinks.length > 0) {
                                filteredList.push({
                                    ...termItem,
                                    links: matchedLinks
                                });
                            }
                        }
                    });
                }
                if (category.links) {
                    filteredLinks = category.links.filter(link => {
                        return searchTerms.every(term => 
                            link.title.toLowerCase().includes(term) || 
                            (link.description && link.description.toLowerCase().includes(term))
                        );
                    });
                }

                if (filteredList.length === 0 && filteredLinks.length === 0) {
                    return; // 如果这个分类下没有任何匹配的结果，就不渲染该分类
                }
            } else {
                filteredList = category.list || [];
                filteredLinks = category.links || [];
            }

            if (filteredList.length === 0 && filteredLinks.length === 0 && !currentSearchQuery) {
                // 如果本来就是空的
                if (!category.list && !category.links) return;
            }

            hasAnyResults = true;

            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'category-section mb-16 pt-4';
            sectionDiv.id = `cat-${category.taxonomy}`;

            // 分类标题
            const titleHTML = `
                <h2 class="text-2xl font-manrope font-bold text-gray-800 dark:text-on-surface mb-6 flex items-center">
                    <span class="material-symbols-outlined mr-2 text-tertiary">folder_open</span>
                    ${category.taxonomy}
                </h2>
            `;
            sectionDiv.innerHTML += titleHTML;

            // 渲染该分类下的 term 列表 (如果有 list)
            if (filteredList && filteredList.length > 0) {
                filteredList.forEach(termItem => {
                    const termDiv = document.createElement('div');
                    termDiv.className = 'mb-8';
                    
                    // 始终显示 term 标题 (带 #)
                    termDiv.innerHTML += `<h3 class="text-lg font-bold text-gray-600 dark:text-on-surface-variant mb-4 ml-2"># ${termItem.term}</h3>`;

                    // 链接网格 (移动端2列，中屏2列，大屏4列)
                    const gridDiv = document.createElement('div');
                    gridDiv.className = 'grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6';
                    
                    if (termItem.links) {
                        termItem.links.forEach(link => {
                            gridDiv.innerHTML += generateCardHTML(link);
                        });
                    }
                    
                    termDiv.appendChild(gridDiv);
                    sectionDiv.appendChild(termDiv);
                });
            } 
            
            // 兼容像"常用推荐"这样直接包含 links 的情况
            if (filteredLinks && filteredLinks.length > 0) {
                const gridDiv = document.createElement('div');
                gridDiv.className = 'grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6';
                
                filteredLinks.forEach(link => {
                    gridDiv.innerHTML += generateCardHTML(link);
                });
                
                sectionDiv.appendChild(gridDiv);
            }

            mainContent.appendChild(sectionDiv);
        });

        if (!hasAnyResults && currentSearchQuery) {
            mainContent.innerHTML = `
                <div class="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-on-surface-variant">
                    <span class="material-symbols-outlined text-6xl mb-4 opacity-50">search_off</span>
                    <p class="text-lg font-medium">未找到包含 "${currentSearchQuery}" 的相关内容</p>
                </div>
            `;
        }
    }

    // 触发吸顶模式
    function enableStickyMode() {
        if (isScrolled) return;
        isScrolled = true;
        
        // 计算并设置占位符高度，防止抖动
        const rect = searchNavContainer.getBoundingClientRect();
        stickyHolder.style.height = rect.height + 'px';
        stickyHolder.classList.remove('hidden');

        // 改变布局类名：移除居中用的高度和 padding
        initialView.classList.remove('min-h-[120vh]', 'pt-[20vh]');
        
        // 隐藏推荐区域，彻底不占空间
        recommendedSection.classList.add('hidden');

        // 搜索导航吸顶 (使用 fixed)
        searchNavContainer.classList.add('fixed', 'top-0', 'left-0', 'right-0', 'bg-white/90', 'dark:bg-surface-dim/90', 'backdrop-blur-xl', 'border-b', 'border-gray-200', 'dark:border-outline-variant/10', 'py-2');
        searchNavContainer.classList.remove('w-full'); 
        
        // 显示主体内容
        mainContent.classList.remove('hidden');
        setTimeout(() => {
            mainContent.classList.remove('opacity-0');
        }, 50);
    }

    // 恢复居中模式
    function disableStickyMode() {
        // 只有在"全部/首页"时才允许恢复居中，其他分类永远保持吸顶
        if (!isScrolled || currentCategory !== 'all') return;
        isScrolled = false;

        // 隐藏占位符
        stickyHolder.classList.add('hidden');

        // 恢复初始布局间距和高度，强制产生可滚动区域
        initialView.classList.add('min-h-[120vh]', 'pt-[20vh]');
        
        // 显示推荐区域
        recommendedSection.classList.remove('hidden');

        // 取消吸顶
        searchNavContainer.classList.remove('fixed', 'top-0', 'left-0', 'right-0', 'bg-white/90', 'dark:bg-surface-dim/90', 'backdrop-blur-xl', 'border-b', 'border-gray-200', 'dark:border-outline-variant/10', 'py-2');
        searchNavContainer.classList.add('w-full');
        
        // 隐藏主体内容
        mainContent.classList.add('opacity-0');
        setTimeout(() => {
            mainContent.classList.add('hidden');
        }, 300); // 缩短隐藏时间，避免留白
    }

    // 设置分类点击事件
    function setupCategoryListeners() {
        const categoryButtons = document.querySelectorAll('.category-btn');
        
        categoryButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // 重置所有按钮样式
                categoryButtons.forEach(b => {
                    b.classList.remove('bg-tertiary', 'text-white', 'dark:text-on-tertiary', 'font-bold');
                    b.classList.add('bg-white', 'dark:bg-surface-container-low', 'text-gray-600', 'dark:text-on-surface-variant', 'font-medium');
                });
                
                // 设置当前按钮为激活样式
                btn.classList.remove('bg-white', 'dark:bg-surface-container-low', 'text-gray-600', 'dark:text-on-surface-variant', 'font-medium');
                btn.classList.add('bg-tertiary', 'text-white', 'dark:text-on-tertiary', 'font-bold');

                currentCategory = btn.getAttribute('data-target');
                
                // 重新渲染主体内容
                renderMainContent();

                // 强制进入吸顶模式
                enableStickyMode();
                
                // 滚动到顶部以防之前滚动过深
                window.scrollTo({ top: 1, behavior: 'smooth' }); // 设置为1而不是0，防止立刻触发 disableStickyMode
            });
        });
    }

    // 滚动监听：处理布局切换和吸顶
    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;

        // 向下滑动大于 10px 时，如果还没吸顶，则触发吸顶并展示全部网站
        if (scrollY > 10 && !isScrolled) {
            enableStickyMode();
        } 
    });

    // 处理顶部下拉恢复居中逻辑 (非吸顶模式)
    // 监听滚轮事件 (PC 端)
    window.addEventListener('wheel', (e) => {
        // 如果处于吸顶模式，且是"首页"，且当前已经滚动到了最顶部
        if (isScrolled && currentCategory === 'all' && window.scrollY <= 0) {
            // e.deltaY < 0 表示向上滚动 (向下拉)
            if (e.deltaY < 0) {
                disableStickyMode();
            }
        }
    });

    // 监听触摸滑动事件 (移动端)
    let touchStartY = 0;
    window.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
    });

    window.addEventListener('touchmove', (e) => {
        if (isScrolled && currentCategory === 'all' && window.scrollY <= 0) {
            const touchCurrentY = e.touches[0].clientY;
            // touchCurrentY > touchStartY 表示手指向下滑动 (页面向下拉)
            if (touchCurrentY - touchStartY > 20) { // 加一点小阈值防止误触
                disableStickyMode();
            }
        }
    });
});